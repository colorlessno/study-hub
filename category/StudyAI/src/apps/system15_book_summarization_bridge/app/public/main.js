const health = document.querySelector('#health');
const form = document.querySelector('#job-form');
const message = document.querySelector('#form-message');
const jobs = document.querySelector('#jobs');
const jobDetail = document.querySelector('#job-detail');
const resultDetail = document.querySelector('#result-detail');
const showSections = document.querySelector('#show-sections');
const showArtifacts = document.querySelector('#show-artifacts');
let selectedJobId = '';

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}

function formatted(value) {
  return JSON.stringify(value, null, 2);
}

async function loadHealth() {
  try {
    const response = await fetch('/health');
    health.textContent = formatted(await response.json());
  } catch (error) {
    health.textContent = error.message;
  }
}

async function selectJob(jobId) {
  selectedJobId = jobId;
  const job = await request(`/api/jobs/${jobId}`);
  jobDetail.textContent = formatted(job);
  resultDetail.textContent = 'セクションまたは成果物を選んでください。';
  showSections.disabled = false;
  showArtifacts.disabled = false;
}

async function loadJobs() {
  try {
    const data = await request('/api/jobs');
    jobs.replaceChildren();
    if (data.jobs.length === 0) {
      jobs.textContent = 'ジョブはまだありません。';
      return;
    }
    data.jobs.forEach((job) => {
      const row = document.createElement('div');
      row.className = 'job';
      const summary = document.createElement('div');
      summary.innerHTML = `<strong>${job.book_id}</strong><br><span class="status ${job.status}">${job.status}</span> / ${job.current_phase}<br>${job.job_id}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '詳細を表示';
      button.addEventListener('click', () => selectJob(job.job_id));
      row.append(summary, button);
      jobs.append(row);
    });
  } catch (error) {
    jobs.textContent = error.message;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '既存CLIで要約処理を順次実行しています。完了までこの画面を閉じないでください。';
  const data = new FormData(form);
  const body = {
    input_type: data.get('input_type'),
    input_path: data.get('input_path'),
    book_id: data.get('book_id'),
    max_pages: Number(data.get('max_pages')),
    resume: data.get('resume') === 'on',
    enable_visual_extraction: data.get('enable_visual_extraction') === 'on',
    rights_confirmed: data.get('rights_confirmed') === 'on',
    output_formats: ['markdown', 'json']
  };
  try {
    const created = await request('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    message.textContent = `ジョブ処理が${created.status}になりました: ${created.job_id}`;
    await loadJobs();
    await selectJob(created.job_id);
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelector('#refresh').addEventListener('click', loadJobs);
showSections.addEventListener('click', async () => {
  resultDetail.textContent = formatted(await request(`/api/jobs/${selectedJobId}/sections`));
});
showArtifacts.addEventListener('click', async () => {
  resultDetail.textContent = formatted(await request(`/api/jobs/${selectedJobId}/artifacts`));
});

await loadHealth();
await loadJobs();
