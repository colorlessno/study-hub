import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  copyFileSync
} from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(appDirectory, 'public');
const appRoot = path.resolve(appDirectory, '..');
const defaultCliRoot = path.resolve(appRoot, '..', '..', '..', '..', '..', 'book_summarization_cli');
const defaultRuntimeRoot = path.join(appRoot, '.runtime');
const imageExtensions = new Set(['.bmp', '.gif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp']);
const artifactStages = [
  'capture',
  'output_images_cropped',
  'output_pages',
  'ocr',
  'vlm_ocr',
  'section_map',
  'sections',
  'visuals',
  'sections_text',
  'sections_summary_input',
  'sections_summary',
  'summaries'
];
const imageDirectoryTasks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 24, 26, 27, 28, 38, 41, 43, 45, 46, 47, 48];

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value, null, 2);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function serveStatic(response, pathname) {
  const fileName = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(publicDirectory, fileName);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`) || !existsSync(filePath)) return false;
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
  return true;
}

function safeBookId(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(normalized) ? normalized : '';
}

function safeJobId(value) {
  return /^job_[0-9]{8}T[0-9]{6}_[a-f0-9]{6}$/.test(value) ? value : '';
}

function makeJobId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
  return `job_${stamp}_${Math.random().toString(16).slice(2, 8).padEnd(6, '0')}`;
}

function ensureInside(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('作業領域の外側は操作できません。');
  }
  return resolvedCandidate;
}

function jobDirectory(runtimeRoot, jobId) {
  return ensureInside(runtimeRoot, path.join(runtimeRoot, 'jobs', jobId));
}

function jobFile(runtimeRoot, jobId) {
  return path.join(jobDirectory(runtimeRoot, jobId), 'job.json');
}

function loadJob(runtimeRoot, jobId) {
  const file = jobFile(runtimeRoot, jobId);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

function saveJob(runtimeRoot, job) {
  const directory = jobDirectory(runtimeRoot, job.job_id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(jobFile(runtimeRoot, job.job_id), `${JSON.stringify(job, null, 2)}\n`, 'utf8');
}

function listJobs(runtimeRoot) {
  const jobsRoot = path.join(runtimeRoot, 'jobs');
  if (!existsSync(jobsRoot)) return [];
  return readdirSync(jobsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && safeJobId(entry.name))
    .map((entry) => loadJob(runtimeRoot, entry.name))
    .filter(Boolean)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function appendLog(runtimeRoot, jobId, text) {
  const job = loadJob(runtimeRoot, jobId);
  if (!job) return;
  job.log = `${job.log ?? ''}${text}`.slice(-120000);
  job.updated_at = new Date().toISOString();
  saveJob(runtimeRoot, job);
}

function updateJob(runtimeRoot, jobId, changes) {
  const job = loadJob(runtimeRoot, jobId);
  if (!job) return null;
  Object.assign(job, changes, { updated_at: new Date().toISOString() });
  saveJob(runtimeRoot, job);
  return job;
}

function prepareConfig(cliRoot, runtimeRoot, job) {
  const source = path.resolve(cliRoot, 'cli', 'config.toml');
  if (!existsSync(source)) throw new Error(`設定ファイルが見つかりません: ${source}`);
  let content = readFileSync(source, 'utf8');
  const captureStart = content.indexOf('[capture_task]');
  if (captureStart < 0) throw new Error('config.tomlに[capture_task]がありません。');
  const nextSection = content.indexOf('\n[', captureStart + 1);
  const end = nextSection < 0 ? content.length : nextSection;
  let captureSection = content.slice(captureStart, end);
  if (/^#?\s*max_pages\s*=.*$/m.test(captureSection)) {
    captureSection = captureSection.replace(/^#?\s*max_pages\s*=.*$/m, `max_pages = ${job.max_pages}`);
  } else {
    captureSection = captureSection.replace('[capture_task]', `[capture_task]\nmax_pages = ${job.max_pages}`);
  }
  content = `${content.slice(0, captureStart)}${captureSection}${content.slice(end)}`;
  const target = path.join(jobDirectory(runtimeRoot, job.job_id), 'config.toml');
  writeFileSync(target, content, 'utf8');
  return target;
}

function stageImageDirectory(cliRoot, inputPath, bookId, maxPages) {
  const source = path.resolve(inputPath);
  if (!existsSync(source) || !statSync(source).isDirectory()) {
    throw new Error(`画像フォルダーが見つかりません: ${source}`);
  }
  const files = readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, 'ja'))
    .slice(0, maxPages);
  if (files.length === 0) throw new Error('対象画像がありません。');
  const target = path.resolve(cliRoot, 'capture', bookId);
  mkdirSync(target, { recursive: true });
  files.forEach((entry) => copyFileSync(path.join(source, entry.name), path.join(target, entry.name)));
  return files.length;
}

function resolvePython(cliRoot, options) {
  if (options.pythonCommand) {
    return { command: options.pythonCommand, prefixArgs: options.pythonPrefixArgs ?? [] };
  }
  if (process.env.BOOK_SUMMARIZATION_PYTHON) {
    let prefixArgs = [];
    if (process.env.BOOK_SUMMARIZATION_PYTHON_ARGS) {
      const parsed = JSON.parse(process.env.BOOK_SUMMARIZATION_PYTHON_ARGS);
      if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
        throw new Error('BOOK_SUMMARIZATION_PYTHON_ARGSはJSON文字列配列で指定してください。');
      }
      prefixArgs = parsed;
    }
    return { command: process.env.BOOK_SUMMARIZATION_PYTHON, prefixArgs };
  }
  const venvPython = path.join(cliRoot, 'venv', 'Scripts', 'python.exe');
  if (existsSync(venvPython)) return { command: venvPython, prefixArgs: [] };
  return { command: 'python', prefixArgs: [] };
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      windowsHide: true,
      shell: false
    });
    child.stdout.on('data', (chunk) => options.onOutput?.(chunk.toString('utf8')));
    child.stderr.on('data', (chunk) => options.onOutput?.(chunk.toString('utf8')));
    child.on('error', (error) => resolve({ exitCode: null, error }));
    child.on('close', (exitCode) => resolve({ exitCode, error: null }));
  });
}

async function stagePdf(python, cliRoot, inputPath, bookId, maxPages, onOutput) {
  const source = path.resolve(inputPath);
  if (!existsSync(source) || !statSync(source).isFile() || path.extname(source).toLowerCase() !== '.pdf') {
    throw new Error(`PDFが見つかりません: ${source}`);
  }
  const target = path.resolve(cliRoot, 'capture', bookId);
  mkdirSync(target, { recursive: true });
  const script = [
    'from pathlib import Path',
    'import sys',
    'from pdf2image import convert_from_path',
    'src, out, count = sys.argv[1], Path(sys.argv[2]), int(sys.argv[3])',
    'out.mkdir(parents=True, exist_ok=True)',
    'pages = convert_from_path(src, first_page=1, last_page=count)',
    '[page.save(out / f"page_{index:04d}.png") for index, page in enumerate(pages, 1)]',
    'print(len(pages))'
  ].join('; ');
  const result = await runProcess(
    python.command,
    [...python.prefixArgs, '-c', script, source, target, String(maxPages)],
    { cwd: cliRoot, onOutput }
  );
  if (result.error) throw result.error;
  if (result.exitCode !== 0) throw new Error(`PDFのページ変換に失敗しました。終了コード: ${result.exitCode}`);
  return readdirSync(target).filter((name) => imageExtensions.has(path.extname(name).toLowerCase())).length;
}

function commandForJob(python, cliRoot, configPath, job) {
  const args = [
    ...python.prefixArgs,
    path.join(cliRoot, 'cli', 'cli_main.py'),
    '--book_id', job.book_id,
    '--config', configPath,
    '--log-stdout'
  ];
  if (job.input_type === 'capture') {
    args.push('--mode', 'full');
  } else {
    const tasks = job.target_tasks.length > 0 ? job.target_tasks : imageDirectoryTasks;
    args.push('--mode', 'single', '--target_task_no', tasks.join(','));
  }
  if (job.resume) args.push('--resume');
  if (job.enable_visual_extraction) args.push('--enable_visual_text');
  if (job.output_formats.includes('markdown')) args.push('--enable_section_text_summary');
  return { command: python.command, args };
}

function countFiles(root, limit = 5000) {
  if (!existsSync(root)) return 0;
  let count = 0;
  const pending = [root];
  while (pending.length > 0 && count < limit) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.isFile()) count += 1;
      if (count >= limit) break;
    }
  }
  return count;
}

function artifactCandidates(cliRoot, bookId) {
  return artifactStages.flatMap((stage) => [
    { type: stage, path: path.join(cliRoot, stage, bookId) },
    { type: stage, path: path.join(cliRoot, 'cli', stage, bookId) },
    { type: stage, path: path.join(cliRoot, 'output', bookId, stage) }
  ]).filter((item, index, items) => items.findIndex((candidate) => candidate.path === item.path) === index);
}

function collectArtifacts(cliRoot, bookId) {
  return artifactCandidates(cliRoot, bookId)
    .filter((item) => existsSync(item.path) && statSync(item.path).isDirectory())
    .map((item) => ({
      artifact_type: item.type,
      path: item.path,
      file_count: countFiles(item.path)
    }));
}

function collectSections(cliRoot, bookId) {
  const directories = artifactCandidates(cliRoot, bookId)
    .filter((item) => item.type === 'sections_summary' && existsSync(item.path) && statSync(item.path).isDirectory())
    .map((item) => item.path);
  const sections = [];
  for (const directory of directories) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') continue;
      const filePath = path.join(directory, entry.name);
      const summary = readFileSync(filePath, 'utf8');
      sections.push({
        section_id: path.basename(entry.name, '.md'),
        title: summary.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(entry.name, '.md'),
        summary_text: summary,
        artifact_path: filePath
      });
    }
  }
  return sections;
}

async function executeJob(config, jobId) {
  const job = updateJob(config.runtimeRoot, jobId, { status: 'running', current_phase: 'input_staging' });
  if (!job) return;
  const python = resolvePython(config.cliRoot, config);
  const onOutput = (text) => appendLog(config.runtimeRoot, jobId, text);
  try {
    let totalPages = 0;
    if (job.input_type === 'image_dir') {
      totalPages = stageImageDirectory(config.cliRoot, job.input_path, job.book_id, job.max_pages);
    } else if (job.input_type === 'pdf') {
      totalPages = await stagePdf(python, config.cliRoot, job.input_path, job.book_id, job.max_pages, onOutput);
    }
    updateJob(config.runtimeRoot, jobId, {
      current_phase: 'pipeline',
      total_pages: totalPages || null,
      processed_pages: totalPages || 0
    });
    const configPath = prepareConfig(config.cliRoot, config.runtimeRoot, job);
    const command = commandForJob(python, config.cliRoot, configPath, job);
    onOutput(`[StudyHub] ${command.command} ${command.args.join(' ')}\n`);
    const result = await runProcess(command.command, command.args, { cwd: config.cliRoot, onOutput });
    if (result.error) throw result.error;
    if (result.exitCode !== 0) throw new Error(`book_summarization_cliが終了コード${result.exitCode}で失敗しました。`);
    updateJob(config.runtimeRoot, jobId, {
      status: 'completed',
      current_phase: 'completed',
      completed_at: new Date().toISOString(),
      artifacts: collectArtifacts(config.cliRoot, job.book_id)
    });
  } catch (error) {
    onOutput(`[StudyHub] ${error instanceof Error ? error.message : String(error)}\n`);
    updateJob(config.runtimeRoot, jobId, {
      status: 'failed',
      current_phase: 'failed',
      error: error instanceof Error ? error.message : String(error),
      completed_at: new Date().toISOString(),
      artifacts: collectArtifacts(config.cliRoot, job.book_id)
    });
  }
}

function validateJobRequest(body) {
  const inputType = typeof body.input_type === 'string' ? body.input_type : '';
  if (!['capture', 'pdf', 'image_dir'].includes(inputType)) return 'input_typeはcapture、pdf、image_dirから選んでください。';
  if (body.rights_confirmed !== true) return '著作権フリーまたは利用許諾済みであることを確認してください。';
  if (inputType !== 'capture' && (typeof body.input_path !== 'string' || !body.input_path.trim())) {
    return 'PDFまたは画像フォルダーのパスを入力してください。';
  }
  if (!safeBookId(body.book_id)) return 'book_idは英数字、ハイフン、アンダースコアで指定してください。';
  if (body.target_tasks !== undefined && (
    !Array.isArray(body.target_tasks)
    || body.target_tasks.some((value) => !Number.isInteger(value) || value < 0 || value > 999)
  )) return 'target_tasksはタスク番号の配列で指定してください。';
  return null;
}

export function createBookSummarizationBridge(options = {}) {
  const config = {
    cliRoot: path.resolve(options.cliRoot ?? process.env.BOOK_SUMMARIZATION_CLI_ROOT ?? defaultCliRoot),
    runtimeRoot: path.resolve(options.runtimeRoot ?? process.env.SYSTEM15_RUNTIME_ROOT ?? defaultRuntimeRoot),
    pythonCommand: options.pythonCommand,
    pythonPrefixArgs: options.pythonPrefixArgs
  };
  let activeJobId = null;
  mkdirSync(path.join(config.runtimeRoot, 'jobs'), { recursive: true });

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        const cliMain = path.join(config.cliRoot, 'cli', 'cli_main.py');
        const cliConfig = path.join(config.cliRoot, 'cli', 'config.toml');
        return sendJson(response, existsSync(cliMain) && existsSync(cliConfig) ? 200 : 503, {
          status: existsSync(cliMain) && existsSync(cliConfig) ? 'ready' : 'unavailable',
          cli_root: config.cliRoot,
          cli_main_exists: existsSync(cliMain),
          config_exists: existsSync(cliConfig),
          persistence: config.runtimeRoot
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/jobs') {
        return sendJson(response, 200, { jobs: listJobs(config.runtimeRoot) });
      }

      if (request.method === 'POST' && url.pathname === '/api/jobs') {
        if (activeJobId) {
          return sendJson(response, 409, {
            error: `別のジョブを順次処理中です: ${activeJobId}`
          });
        }
        const body = await readJson(request);
        const validationError = validateJobRequest(body);
        if (validationError) return sendJson(response, 400, { error: validationError });
        const createdAt = new Date().toISOString();
        const job = {
          job_id: makeJobId(),
          book_id: safeBookId(body.book_id),
          input_type: body.input_type,
          input_path: typeof body.input_path === 'string' ? body.input_path.trim() : '',
          status: 'queued',
          current_phase: 'queued',
          total_pages: null,
          processed_pages: 0,
          max_pages: Math.min(Math.max(Number(body.max_pages) || 500, 1), 5000),
          resume: body.resume !== false,
          enable_visual_extraction: body.enable_visual_extraction !== false,
          output_formats: Array.isArray(body.output_formats)
            ? body.output_formats.filter((value) => ['markdown', 'json'].includes(value))
            : ['markdown', 'json'],
          target_tasks: Array.isArray(body.target_tasks) ? body.target_tasks : [],
          output_dir: path.join(config.cliRoot, 'sections_summary', safeBookId(body.book_id)),
          created_at: createdAt,
          updated_at: createdAt,
          completed_at: null,
          log: '',
          artifacts: []
        };
        saveJob(config.runtimeRoot, job);
        activeJobId = job.job_id;
        try {
          await executeJob(config, job.job_id);
        } finally {
          activeJobId = null;
        }
        const completedJob = loadJob(config.runtimeRoot, job.job_id);
        return sendJson(response, 200, {
          job_id: job.job_id,
          status: completedJob?.status ?? 'failed'
        });
      }

      const jobMatch = url.pathname.match(/^\/api\/jobs\/(job_[0-9A-Za-z_]+)$/);
      if (request.method === 'GET' && jobMatch) {
        const jobId = safeJobId(jobMatch[1]);
        const job = jobId ? loadJob(config.runtimeRoot, jobId) : null;
        return job ? sendJson(response, 200, job) : sendJson(response, 404, { error: 'JOB_NOT_FOUND' });
      }

      const sectionsMatch = url.pathname.match(/^\/api\/jobs\/(job_[0-9A-Za-z_]+)\/sections$/);
      if (request.method === 'GET' && sectionsMatch) {
        const jobId = safeJobId(sectionsMatch[1]);
        const job = jobId ? loadJob(config.runtimeRoot, jobId) : null;
        if (!job) return sendJson(response, 404, { error: 'JOB_NOT_FOUND' });
        return sendJson(response, 200, { job_id: jobId, sections: collectSections(config.cliRoot, job.book_id) });
      }

      const artifactsMatch = url.pathname.match(/^\/api\/jobs\/(job_[0-9A-Za-z_]+)\/artifacts$/);
      if (request.method === 'GET' && artifactsMatch) {
        const jobId = safeJobId(artifactsMatch[1]);
        const job = jobId ? loadJob(config.runtimeRoot, jobId) : null;
        if (!job) return sendJson(response, 404, { error: 'JOB_NOT_FOUND' });
        return sendJson(response, 200, { job_id: jobId, artifacts: collectArtifacts(config.cliRoot, job.book_id) });
      }

      if (request.method === 'GET' && serveStatic(response, url.pathname)) return;
      return sendJson(response, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });

  return { server, config };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 43715);
  const { server, config } = createBookSummarizationBridge();
  server.listen(port, '127.0.0.1', () => {
    console.log(`[system15] http://127.0.0.1:${port}/`);
    console.log(`[system15] CLI: ${config.cliRoot}`);
  });
}
