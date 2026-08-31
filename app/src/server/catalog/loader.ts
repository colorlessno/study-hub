import fs from 'node:fs';
import path from 'node:path';
import { Ajv } from 'ajv';
import type {
  ActualThemeConnection,
  CatalogMode,
  Field,
  FieldCheckDefinition,
  IntegrationMode,
  LifecycleMode,
  PresentationMode,
  Theme,
  ThemeChecklist,
  ThemeGroup,
  ThemeListProfile,
  ThemeResource,
  ThemeResourceContent
} from '../../shared/catalog.js';

interface FieldsFile {
  schemaVersion: number;
  catalogType: string;
  fields: Field[];
}

interface ThemesFile {
  schemaVersion: number;
  catalogType: string;
  themes: Theme[];
}

interface ActualField {
  id: string;
  name: string;
  path: string;
  entryFile: string;
  themePrefix?: string;
  themeDirectories?: {
    documentationRoot: string;
    implementationRoots: string[];
  };
  numberedThemes: number;
  unitKind: string;
  lifecycle: {
    mode: string;
    managesCleanup?: boolean;
    startGuide?: string;
    check: FieldCheckDefinition;
  };
}

interface ActualFieldsFile {
  schemaVersion: number;
  repository: 'study-hub';
  numberedThemeCount: 163;
  fields: ActualField[];
}

interface ActualTheme {
  id: string;
  fieldId: string;
  name: string;
  entryFile: string;
  presentation: PresentationMode;
  materialOpenMode?: 'embedded' | 'new-window';
  lifecycle: LifecycleMode;
  integrationStatus: 'connected' | 'metadata-only';
  resources?: ThemeResource[];
  connection?: ActualThemeConnection;
}

interface ActualThemesFile {
  schemaVersion: number;
  catalogType: 'actual';
  themeCount: number;
  themes: ActualTheme[];
}

interface ActualThemeGroup extends ThemeGroup {
  fieldId: string;
  themeIds: string[];
  listProfile?: ThemeListProfile;
}

interface ActualThemeListProfile extends ThemeListProfile {
  themeId: string;
}

interface ActualThemeGroupsFile {
  schemaVersion: 1;
  groups: ActualThemeGroup[];
  profiles?: ActualThemeListProfile[];
}

type ThemeChecklistFile = Omit<ThemeChecklist, 'fieldId'>;

interface SampleChecklistsFile {
  schemaVersion: number;
  catalogType: 'sample';
  checklistCount: number;
  checklists: ThemeChecklistFile[];
}

export interface Catalog {
  mode: CatalogMode;
  fields: Field[];
  themes: Theme[];
  themeById: Map<string, Theme>;
  checklists: ThemeChecklist[];
}

export const sampleDataRoot = path.resolve(process.cwd(), '..', 'sample-data');
export const repositoryRoot = path.resolve(process.cwd(), '..');
const actualCatalogRoot = path.join(repositoryRoot, 'catalog');
const actualChecklistRoot = path.join(actualCatalogRoot, 'checklists');

const allowedCombinations = new Set([
  'document/none',
  'document/manual',
  'web/none',
  'web/process',
  'web/stack',
  'web/shared',
  'request/process',
  'request/stack',
  'command/one-shot',
  'command/stack',
  'external-app/process'
]);
const expectedActualConnectionTypes = new Map<string, ActualThemeConnection['type']>([
  ['document/none', 'markdown'],
  ['web/none', 'static-web'],
  ['web/process', 'web-process'],
  ['web/stack', 'web-stack'],
  ['web/shared', 'web-shared'],
  ['request/process', 'request-process'],
  ['request/stack', 'request-stack'],
  ['command/one-shot', 'command-one-shot'],
  ['command/stack', 'command-stack'],
  ['external-app/process', 'external-process']
]);

function readUtf8File(filePath: string, allowExistingBom = false): string {
  const bytes = fs.readFileSync(filePath);
  if (!allowExistingBom && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error(`UTF-8 BOMは使用できません: ${filePath}`);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readUtf8File(filePath)) as T;
}

function readSampleJson<T>(relativePath: string): T {
  return readJsonFile<T>(path.join(sampleDataRoot, relativePath));
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label}に重複があります。`);
  }
}

function loadActualChecklists(themeById: Map<string, Theme>): ThemeChecklist[] {
  if (!fs.existsSync(actualChecklistRoot)) return [];
  const schema = readJsonFile<Record<string, unknown>>(
    path.join(actualCatalogRoot, 'theme-checklist.schema.json')
  );
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  const files = fs.readdirSync(actualChecklistRoot)
    .filter((fileName) => fileName.endsWith('_check.json'))
    .sort((left, right) => left.localeCompare(right));
  const checklists = files.map((fileName) => {
    const checklist = readJsonFile<ThemeChecklistFile>(path.join(actualChecklistRoot, fileName));
    if (!validate(checklist)) {
      throw new Error(
        `catalog/checklists/${fileName} がスキーマに適合しません: ${ajv.errorsText(validate.errors)}`
      );
    }
    if (fileName !== `${checklist.themeId}_check.json`) {
      throw new Error(`チェック設定のファイル名とテーマIDが一致しません: ${fileName}`);
    }
    const theme = themeById.get(checklist.themeId);
    if (!theme) {
      throw new Error(`チェック設定が存在しないテーマを参照しています: ${checklist.themeId}`);
    }
    assertUnique(checklist.items.map((item) => item.id), `${checklist.themeId}のチェック項目ID`);
    return { ...checklist, fieldId: theme.fieldId };
  });
  assertUnique(checklists.map((checklist) => checklist.themeId), 'チェック設定のテーマID');
  return checklists;
}

function resolveSampleDataFile(relativePath: string): string {
  const resolved = path.resolve(sampleDataRoot, relativePath);
  const rootPrefix = `${sampleDataRoot}${path.sep}`;
  if (!resolved.startsWith(rootPrefix) || !fs.existsSync(resolved)) {
    throw new Error(`教材ファイルを確認できません: ${relativePath}`);
  }
  const realRoot = fs.realpathSync(sampleDataRoot);
  const realPath = fs.realpathSync(resolved);
  if (!realPath.startsWith(`${realRoot}${path.sep}`)) {
    throw new Error(`教材ファイルが疑似データの外を参照しています: ${relativePath}`);
  }
  return realPath;
}

function assertMaterialPath(relativePath: string): void {
  resolveSampleDataFile(relativePath);
}

function resolveRepositoryFile(relativePath: string): string {
  const resolved = path.resolve(repositoryRoot, relativePath);
  if (!resolved.startsWith(`${repositoryRoot}${path.sep}`) || !fs.existsSync(resolved)) {
    throw new Error(`実教材入口を確認できません: ${relativePath}`);
  }
  const realRoot = fs.realpathSync(repositoryRoot);
  const realPath = fs.realpathSync(resolved);
  if (!realPath.startsWith(`${realRoot}${path.sep}`)) {
    throw new Error(`実教材入口がリポジトリの外を参照しています: ${relativePath}`);
  }
  return realPath;
}

function resolveRepositoryDirectory(relativePath: string): string {
  const resolved = path.resolve(repositoryRoot, relativePath);
  if (!resolved.startsWith(`${repositoryRoot}${path.sep}`) || !fs.existsSync(resolved)) {
    throw new Error(`実教材の作業フォルダを確認できません: ${relativePath}`);
  }
  const realRoot = fs.realpathSync(repositoryRoot);
  const realPath = fs.realpathSync(resolved);
  if (!realPath.startsWith(`${realRoot}${path.sep}`) || !fs.statSync(realPath).isDirectory()) {
    throw new Error(`実教材の作業フォルダがリポジトリの外を参照しています: ${relativePath}`);
  }
  return realPath;
}

function validateActualFieldCheck(field: ActualField): FieldCheckDefinition {
  const check = field.lifecycle.check;
  if (!['node', 'npm', 'python'].includes(check.command)) {
    throw new Error(`分野の検証コマンドが許可されていません: ${field.id} ${check.command}`);
  }
  if (!Number.isInteger(check.timeoutSeconds) || check.timeoutSeconds < 1 || check.timeoutSeconds > 600) {
    throw new Error(`分野の検証制限時間が不正です: ${field.id}`);
  }
  if (!Array.isArray(check.args) || check.args.length === 0
    || check.args.some((argument) => typeof argument !== 'string' || argument.includes('\0'))) {
    throw new Error(`分野の検証引数が不正です: ${field.id}`);
  }
  if (check.command === 'node') {
    resolveRepositoryFile(check.args[0] as string);
  }
  if (check.command === 'python') {
    const script = check.args.find((argument) => argument.startsWith('category/') && argument.endsWith('.py'));
    if (script) resolveRepositoryFile(script);
  }
  if (check.command === 'npm') {
    const isTest = check.args.length === 3 && check.args[2] === 'test';
    const isNamedScript = check.args.length === 4
      && check.args[2] === 'run'
      && /^[a-zA-Z0-9:_-]+$/u.test(check.args[3] as string);
    if (check.args[0] !== '--prefix' || !check.args[1] || (!isTest && !isNamedScript)) {
      throw new Error(`分野のnpm検証引数が許可されていません: ${field.id}`);
    }
    resolveRepositoryDirectory(check.args[1]);
  }
  return {
    command: check.command,
    args: [...check.args],
    timeoutSeconds: check.timeoutSeconds
  };
}

function assertSafeProcessEntry(workingDirectory: string, entry: string): void {
  const resolved = path.resolve(workingDirectory, entry);
  if (path.isAbsolute(entry) || !resolved.startsWith(`${workingDirectory}${path.sep}`)) {
    throw new Error(`実教材の実行入口が作業フォルダの外を参照しています: ${entry}`);
  }
}

function assertProcessFileEntry(
  themeId: string,
  workingDirectory: string,
  command: string,
  args: string[]
): void {
  const entry = command === 'node'
    ? args[0]
    : command === 'python'
      ? args.find((argument) => (
          argument.toLowerCase().endsWith('.py') && !argument.includes('*') && !argument.includes('?')
        ))
      : undefined;
  if (!entry) return;
  assertSafeProcessEntry(workingDirectory, entry);
  if (entry.replaceAll('\\', '/').startsWith('node_modules/')) return;
  const resolvedEntry = path.resolve(workingDirectory, entry);
  if (!fs.existsSync(resolvedEntry) || !fs.statSync(resolvedEntry).isFile()) {
    throw new Error(`実教材の実行入口を確認できません: ${themeId} ${entry}`);
  }
}

function integrationMode(presentation: PresentationMode): IntegrationMode {
  if (presentation === 'web') return 'embedded';
  if (presentation === 'request') return 'request';
  if (presentation === 'command') return 'command';
  if (presentation === 'external-app') return 'external';
  return 'document';
}

function commandEnvironment(processes: Array<{ command: string; args: string[] }>): string[] {
  const environment = new Set<string>();
  if (processes.some((process) => process.command === 'python')) environment.add('Python');
  if (processes.some((process) => process.command === 'python-venv')) {
    environment.add('Python');
    environment.add('テーマのPython仮想環境');
  }
  if (processes.some((process) => ['node', 'npm'].includes(process.command))) {
    environment.add('Node.js');
  }
  if (processes.some((process) => (
    process.command === 'npm' || process.args[0]?.startsWith('node_modules/')
  ))) {
    environment.add('テーマの依存パッケージ');
  }
  return [...environment];
}

function assertSafeOperationUrls(themes: Theme[]): void {
  const portUsers = new Map<string, Set<string>>();
  for (const theme of themes) {
    const runtimeId = theme.operations.start?.runtimeId ?? theme.id;
    const urls = [
      ...(theme.operations.start?.processes.flatMap((process) => [process.url, process.healthUrl]) ?? []),
      theme.operations.run?.url,
      ...(theme.operations.run?.requests?.map((request) => request.url) ?? [])
    ].filter((url): url is string => Boolean(url));

    for (const value of urls) {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw new Error(`実行URLが不正です: ${theme.id} ${value}`);
      }
      if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
        throw new Error(`実行URLはローカルHTTPだけを指定できます: ${theme.id} ${value}`);
      }
      if (!url.port) continue;
      const users = portUsers.get(url.port) ?? new Set<string>();
      users.add(runtimeId);
      portUsers.set(url.port, users);
    }
  }

  const conflicts = [...portUsers]
    .filter(([, runtimeIds]) => runtimeIds.size > 1)
    .map(([port, runtimeIds]) => `${port} (${[...runtimeIds].join('、')})`);
  if (conflicts.length > 0) {
    throw new Error(`別々の実行環境でローカルポートが重複しています: ${conflicts.join(', ')}`);
  }
}

export function readActualTextMaterial(theme: Theme): { entryFile: string; content: string } {
  if (theme.integrationStatus !== 'connected' || theme.actualConnection?.type !== 'markdown') {
    throw new Error('実教材の表示接続はまだ設定されていません。');
  }
  const filePath = resolveRepositoryFile(theme.actualConnection.file);
  if (path.extname(filePath).toLowerCase() !== '.md') {
    throw new Error('初期接続ではMarkdown教材だけを表示できます。');
  }
  if (fs.statSync(filePath).size > 1024 * 1024) {
    throw new Error('教材ファイルが表示上限を超えています。');
  }
  return {
    entryFile: theme.actualConnection.file,
    content: readUtf8File(filePath)
  };
}

export function readActualThemeReadme(theme: Theme): { entryFile: string; content: string } {
  if (!theme.entryFile) throw new Error('テーマのREADMEが登録されていません。');
  const filePath = resolveRepositoryFile(theme.entryFile);
  if (path.extname(filePath).toLowerCase() !== '.md') {
    throw new Error('READMEとして表示できるのはMarkdownファイルだけです。');
  }
  if (!fs.statSync(filePath).isFile() || fs.statSync(filePath).size > 1024 * 1024) {
    throw new Error('READMEを表示できません。');
  }
  return {
    entryFile: theme.entryFile,
    content: readUtf8File(filePath)
  };
}

export function readActualFieldReadme(field: Field): { entryFile: string; content: string } {
  if (!field.entryFile) throw new Error('分野のREADMEが登録されていません。');
  const filePath = resolveRepositoryFile(field.entryFile);
  if (path.extname(filePath).toLowerCase() !== '.md') {
    throw new Error('READMEとして表示できるのはMarkdownファイルだけです。');
  }
  if (!fs.statSync(filePath).isFile() || fs.statSync(filePath).size > 1024 * 1024) {
    throw new Error('READMEを表示できません。');
  }
  return {
    entryFile: field.entryFile,
    content: readUtf8File(filePath)
  };
}

const resourceExtensions: Record<ThemeResource['format'], Set<string>> = {
  markdown: new Set(['.md']),
  text: new Set(['', '.txt', '.json', '.yaml', '.yml', '.toml', '.xml', '.csv', '.example']),
  source: new Set([
    '.bat', '.c', '.cmd', '.conf', '.cpp', '.cs', '.css', '.example', '.go', '.h', '.html', '.java', '.js', '.jsx',
    '.mjs', '.php', '.prisma', '.ps1', '.py', '.rb', '.rs', '.sh', '.sql', '.ts', '.tsx', '.vue',
    '.yaml', '.yml'
  ])
};

function resolveThemeResourceFile(resource: ThemeResource, catalogMode: CatalogMode): string {
  const filePath = catalogMode === 'actual'
    ? resolveRepositoryFile(resource.path)
    : resolveSampleDataFile(resource.path);
  const file = fs.statSync(filePath);
  if (!file.isFile() || file.size > 1024 * 1024) {
    throw new Error('関連ファイルを表示できません。');
  }
  const extension = path.extname(filePath).toLowerCase();
  if (!resourceExtensions[resource.format].has(extension)) {
    throw new Error(`関連ファイルの形式が定義と一致しません: ${resource.id}`);
  }
  return filePath;
}

export function readThemeResource(
  theme: Theme,
  resourceId: string,
  catalogMode: CatalogMode
): ThemeResourceContent {
  const resource = theme.resources?.find((item) => item.id === resourceId);
  if (!resource) throw new Error('関連ファイルが登録されていません。');
  const filePath = resolveThemeResourceFile(resource, catalogMode);
  return { ...resource, content: readUtf8File(filePath, true) };
}

const staticContentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

export function readActualStaticMaterial(
  theme: Theme,
  requestedPath: string
): { contentType: string; body: Buffer } {
  if (theme.integrationStatus !== 'connected' || theme.actualConnection?.type !== 'static-web') {
    throw new Error('静的Web教材の表示接続はまだ設定されていません。');
  }
  const root = resolveRepositoryFile(theme.actualConnection.root);
  const resolved = path.resolve(root, requestedPath);
  if (!resolved.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolved)) {
    throw new Error('静的Web教材のファイルが見つかりません。');
  }
  const realPath = fs.realpathSync(resolved);
  if (!realPath.startsWith(`${root}${path.sep}`) || !fs.statSync(realPath).isFile()) {
    throw new Error('静的Web教材の外は参照できません。');
  }
  const extension = path.extname(realPath).toLowerCase();
  const contentType = staticContentTypes.get(extension);
  if (!contentType) throw new Error(`表示を許可していないファイル形式です: ${extension}`);
  if (fs.statSync(realPath).size > 5 * 1024 * 1024) {
    throw new Error('静的Web教材のファイルが表示上限を超えています。');
  }
  const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg']);
  const body = textExtensions.has(extension)
    ? Buffer.from(readUtf8File(realPath), 'utf8')
    : fs.readFileSync(realPath);
  return { contentType, body };
}

export function loadCatalog(): Catalog {
  const fieldsFile = readSampleJson<FieldsFile>('fields.json');
  const themesFile = readSampleJson<ThemesFile>('themes.json');
  const checklistsFile = readSampleJson<SampleChecklistsFile>('checklists.json');
  const fieldsSchema = readSampleJson<Record<string, unknown>>('schema/fields.schema.json');
  const themesSchema = readSampleJson<Record<string, unknown>>('schema/themes.schema.json');
  const checklistsSchema = readSampleJson<Record<string, unknown>>('schema/checklists.schema.json');

  const ajv = new Ajv({ allErrors: true, strict: true });
  const validateFields = ajv.compile(fieldsSchema);
  const validateThemes = ajv.compile(themesSchema);
  const validateChecklists = ajv.compile(checklistsSchema);
  if (!validateFields(fieldsFile)) {
    throw new Error(`fields.json がスキーマに適合しません: ${ajv.errorsText(validateFields.errors)}`);
  }
  if (!validateThemes(themesFile)) {
    throw new Error(`themes.json がスキーマに適合しません: ${ajv.errorsText(validateThemes.errors)}`);
  }
  if (!validateChecklists(checklistsFile)) {
    throw new Error(`checklists.json がスキーマに適合しません: ${ajv.errorsText(validateChecklists.errors)}`);
  }

  assertUnique(fieldsFile.fields.map((field) => field.id), '分野ID');
  assertUnique(themesFile.themes.map((theme) => theme.id), 'テーマID');
  assertUnique(checklistsFile.checklists.map((checklist) => checklist.themeId), 'チェック設定のテーマID');
  if (checklistsFile.checklistCount !== checklistsFile.checklists.length) {
    throw new Error('checklists.json の件数とチェック設定数が一致しません。');
  }
  const fieldIds = new Set(fieldsFile.fields.map((field) => field.id));

  for (const theme of themesFile.themes) {
    if (!fieldIds.has(theme.fieldId)) {
      throw new Error(`存在しない分野IDです: ${theme.fieldId}`);
    }
    if (!allowedCombinations.has(`${theme.presentation}/${theme.lifecycle}`)) {
      throw new Error(`未定義の画面動作です: ${theme.id}`);
    }
    assertMaterialPath(theme.material.path);
    if (theme.resources) {
      assertUnique(theme.resources.map((resource) => resource.id), `${theme.id}の関連ファイルID`);
      for (const resource of theme.resources) resolveThemeResourceFile(resource, 'sample');
    }
  }

  const fields = fieldsFile.fields
    .map((field) => ({
      ...field,
      themeCount: themesFile.themes.filter((theme) => theme.fieldId === field.id).length
    }))
    .sort((left, right) => left.order - right.order);
  const themes = themesFile.themes.map((theme) => ({
    ...theme,
    integrationMode: integrationMode(theme.presentation),
    integrationStatus: 'connected' as const
  }));
  assertSafeOperationUrls(themes);
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  const checklists = checklistsFile.checklists.map((checklist) => {
    const theme = themeById.get(checklist.themeId);
    if (!theme) {
      throw new Error(`チェック設定が存在しない疑似テーマを参照しています: ${checklist.themeId}`);
    }
    assertUnique(checklist.items.map((item) => item.id), `${checklist.themeId}のチェック項目ID`);
    return { ...checklist, fieldId: theme.fieldId };
  });
  const checklistThemeIds = new Set(checklists.map((checklist) => checklist.themeId));
  const themeWithoutChecklist = themes.find((theme) => !checklistThemeIds.has(theme.id));
  if (themeWithoutChecklist) {
    throw new Error(`チェック設定がない疑似テーマです: ${themeWithoutChecklist.id}`);
  }

  return {
    mode: 'sample',
    fields,
    themes,
    themeById,
    checklists
  };
}

export function loadActualCatalog(): Catalog {
  const fieldsFile = readJsonFile<ActualFieldsFile>(path.join(actualCatalogRoot, 'fields.json'));
  const themesFile = readJsonFile<ActualThemesFile>(path.join(actualCatalogRoot, 'themes.json'));
  const themeGroupsFile = readJsonFile<ActualThemeGroupsFile>(
    path.join(actualCatalogRoot, 'theme-groups.json')
  );
  const fieldsSchema = readJsonFile<Record<string, unknown>>(
    path.join(actualCatalogRoot, 'fields.schema.json')
  );
  const themesSchema = readJsonFile<Record<string, unknown>>(
    path.join(actualCatalogRoot, 'themes.schema.json')
  );
  const themeGroupsSchema = readJsonFile<Record<string, unknown>>(
    path.join(actualCatalogRoot, 'theme-groups.schema.json')
  );
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validateFields = ajv.compile(fieldsSchema);
  const validateThemes = ajv.compile(themesSchema);
  const validateThemeGroups = ajv.compile(themeGroupsSchema);
  if (!validateFields(fieldsFile)) {
    throw new Error(`catalog/fields.json がスキーマに適合しません: ${ajv.errorsText(validateFields.errors)}`);
  }
  if (!validateThemes(themesFile)) {
    throw new Error(`catalog/themes.json がスキーマに適合しません: ${ajv.errorsText(validateThemes.errors)}`);
  }
  if (!validateThemeGroups(themeGroupsFile)) {
    throw new Error(
      `catalog/theme-groups.json がスキーマに適合しません: ${ajv.errorsText(validateThemeGroups.errors)}`
    );
  }

  assertUnique(fieldsFile.fields.map((field) => field.id), '実分野ID');
  assertUnique(themesFile.themes.map((theme) => theme.id), '実テーマID');
  const fieldIds = new Set(fieldsFile.fields.map((field) => field.id));
  assertUnique(
    themeGroupsFile.groups.map((group) => `${group.fieldId}/${group.id}`),
    '実テーマグループID'
  );
  assertUnique(
    themeGroupsFile.groups.flatMap((group) => group.themeIds),
    '実テーマグループに含まれるテーマID'
  );
  assertUnique(
    (themeGroupsFile.profiles ?? []).map((profile) => profile.themeId),
    '実テーマ一覧プロファイルのテーマID'
  );
  const sourceThemeById = new Map(themesFile.themes.map((theme) => [theme.id, theme]));
  const groupByThemeId = new Map<string, ThemeGroup>();
  const listProfileByThemeId = new Map<string, ThemeListProfile>();
  for (const group of themeGroupsFile.groups) {
    if (!fieldIds.has(group.fieldId)) {
      throw new Error(`実テーマグループが存在しない分野を参照しています: ${group.id} ${group.fieldId}`);
    }
    for (const themeId of group.themeIds) {
      const theme = sourceThemeById.get(themeId);
      if (!theme) throw new Error(`実テーマグループが存在しないテーマを参照しています: ${group.id} ${themeId}`);
      if (theme.fieldId !== group.fieldId) {
        throw new Error(`実テーマグループとテーマの分野が一致しません: ${group.id} ${themeId}`);
      }
      groupByThemeId.set(themeId, {
        id: group.id,
        name: group.name,
        summary: group.summary,
        order: group.order
      });
      if (group.listProfile) listProfileByThemeId.set(themeId, group.listProfile);
    }
  }
  for (const profile of themeGroupsFile.profiles ?? []) {
    if (!sourceThemeById.has(profile.themeId)) {
      throw new Error(`実テーマ一覧プロファイルが存在しないテーマを参照しています: ${profile.themeId}`);
    }
    listProfileByThemeId.set(profile.themeId, {
      ...(listProfileByThemeId.get(profile.themeId) ?? {}),
      interactionMode: profile.interactionMode,
      ...(profile.initialization ? { initialization: profile.initialization } : {}),
      ...(profile.environmentScope ? { environmentScope: profile.environmentScope } : {}),
      ...(profile.cleanupImpact ? { cleanupImpact: profile.cleanupImpact } : {}),
      ...(profile.relationshipNote ? { relationshipNote: profile.relationshipNote } : {}),
      ...(profile.outputNote ? { outputNote: profile.outputNote } : {})
    });
  }

  const themes: Theme[] = themesFile.themes.map((theme) => {
    if (!fieldIds.has(theme.fieldId)) {
      throw new Error(`存在しない実分野IDです: ${theme.fieldId}`);
    }
    if (!allowedCombinations.has(`${theme.presentation}/${theme.lifecycle}`)) {
      throw new Error(`未定義の実テーマ画面動作です: ${theme.id}`);
    }
    const expectedConnectionType = expectedActualConnectionTypes.get(
      `${theme.presentation}/${theme.lifecycle}`
    );
    if (theme.connection && theme.connection.type !== expectedConnectionType) {
      throw new Error(
        `実テーマの画面動作と起動定義が一致しません: ${theme.id} `
        + `${theme.presentation}/${theme.lifecycle} ${theme.connection.type}`
      );
    }
    resolveRepositoryFile(theme.entryFile);
    if (theme.resources) {
      assertUnique(theme.resources.map((resource) => resource.id), `${theme.id}の関連ファイルID`);
      for (const resource of theme.resources) resolveThemeResourceFile(resource, 'actual');
    }
    if (theme.integrationStatus === 'connected' && !theme.connection) {
      throw new Error(`接続済み実テーマに表示定義がありません: ${theme.id}`);
    }
    if (theme.connection?.type === 'markdown') {
      resolveRepositoryFile(theme.connection.file);
    }
    if (theme.connection?.type === 'static-web') {
      resolveRepositoryFile(path.join(theme.connection.root, theme.connection.entryFile));
    }
    if (theme.connection?.type === 'web-process' || theme.connection?.type === 'request-process') {
      const workingDirectory = resolveRepositoryDirectory(theme.connection.cwd);
      assertProcessFileEntry(
        theme.id,
        workingDirectory,
        theme.connection.command,
        theme.connection.args
      );
    }
    if (theme.connection?.type === 'request-stack') {
      resolveRepositoryDirectory(theme.connection.cwd);
    }
    if (theme.connection?.type === 'command-one-shot') {
      const workingDirectory = resolveRepositoryDirectory(theme.connection.cwd);
      const processes = theme.connection.commands
        ?? theme.connection.operations?.flatMap((operation) => operation.processes)
        ?? [];
      for (const process of processes) {
        assertProcessFileEntry(theme.id, workingDirectory, process.command, process.args);
      }
    }
    if (theme.connection?.type === 'command-stack') {
      const workingDirectory = resolveRepositoryDirectory(theme.connection.cwd);
      const runProcesses = theme.connection.run.type === 'commands'
        ? theme.connection.run.commands
        : theme.connection.run.type === 'operations'
          ? theme.connection.run.operations.flatMap((operation) => operation.processes)
          : [];
      const processes = [
        ...theme.connection.startup,
        ...runProcesses,
        ...theme.connection.cleanup
      ];
      for (const process of processes) {
        assertProcessFileEntry(theme.id, workingDirectory, process.command, process.args);
        if (process.stdinFile) resolveRepositoryFile(process.stdinFile);
      }
    }
    if (theme.connection?.type === 'web-stack' || theme.connection?.type === 'web-shared') {
      const workingDirectory = resolveRepositoryDirectory(theme.connection.cwd);
      const runProcesses = theme.connection.type === 'web-stack'
        ? theme.connection.run?.operations.flatMap((operation) => operation.processes) ?? []
        : [];
      for (const process of [
        ...theme.connection.startup,
        ...runProcesses,
        ...theme.connection.cleanup
      ]) {
        assertProcessFileEntry(theme.id, workingDirectory, process.command, process.args);
      }
    }
    if (theme.connection?.type === 'external-process') {
      resolveRepositoryDirectory(theme.connection.cwd);
    }
    const webProcess = theme.connection?.type === 'web-process' ? theme.connection : undefined;
    const requestProcess = theme.connection?.type === 'request-process' ? theme.connection : undefined;
    const requestStack = theme.connection?.type === 'request-stack' ? theme.connection : undefined;
    const commandOneShot = theme.connection?.type === 'command-one-shot'
      ? theme.connection
      : undefined;
    const commandStack = theme.connection?.type === 'command-stack'
      ? theme.connection
      : undefined;
    const webStack = theme.connection?.type === 'web-stack'
      ? theme.connection
      : undefined;
    const webShared = theme.connection?.type === 'web-shared'
      ? theme.connection
      : undefined;
    const externalProcess = theme.connection?.type === 'external-process'
      ? theme.connection
      : undefined;
    const managedProcess = webProcess ?? requestProcess;
    const requestDefinition = requestProcess?.request
      ?? requestStack?.request
      ?? (commandStack?.run.type === 'request' ? commandStack.run.request : undefined);
    const requestDefinitions = requestProcess?.requests ?? requestStack?.requests;
    const startProcesses = requestStack
      ? requestStack.startup.map((process) => ({ ...process, cwd: requestStack.cwd }))
      : commandStack
        ? commandStack.startup.map((process) => ({ ...process, cwd: commandStack.cwd }))
      : webStack
        ? webStack.startup.map((process) => ({ ...process, cwd: webStack.cwd }))
      : webShared
        ? webShared.startup.map((process) => ({ ...process, cwd: webShared.cwd }))
      : externalProcess
        ? [{
            id: 'external-app',
            command: externalProcess.command,
            args: externalProcess.args,
            cwd: externalProcess.cwd
          }]
      : managedProcess
        ? [
            {
              id: requestProcess ? 'api' : 'web',
              command: managedProcess.command,
              args: managedProcess.args,
              cwd: managedProcess.cwd,
              ...(requestProcess ? { env: requestProcess.env } : {}),
              url: managedProcess.url,
              healthUrl: managedProcess.healthUrl
            }
          ]
        : undefined;
    const cleanupProcesses = requestStack
      ? requestStack.cleanup.map((process) => ({ ...process, cwd: requestStack.cwd }))
      : commandStack
        ? commandStack.cleanup.map((process) => ({ ...process, cwd: commandStack.cwd }))
      : webStack
        ? webStack.cleanup.map((process) => ({ ...process, cwd: webStack.cwd }))
      : webShared
        ? webShared.cleanup.map((process) => ({ ...process, cwd: webShared.cwd }))
      : undefined;
    const commandProcesses = commandOneShot
      ? commandOneShot.commands?.map((process) => ({ ...process, cwd: commandOneShot.cwd }))
      : commandStack?.run.type === 'commands'
        ? commandStack.run.commands.map((process) => ({ ...process, cwd: commandStack.cwd }))
        : undefined;
    const commandOperationDefinitions = commandOneShot?.operations
      ? { cwd: commandOneShot.cwd, operations: commandOneShot.operations }
      : commandStack?.run.type === 'operations'
        ? { cwd: commandStack.cwd, operations: commandStack.run.operations }
      : webStack?.run?.type === 'operations'
        ? { cwd: webStack.cwd, operations: webStack.run.operations }
        : undefined;
    const commandOperations = commandOperationDefinitions
      ? commandOperationDefinitions.operations.map((operation) => ({
          ...operation,
          processes: operation.processes.map((process) => ({
            ...process,
            cwd: commandOperationDefinitions.cwd
          }))
        }))
      : undefined;
    const operations: Theme['operations'] = {};
    if (startProcesses) {
      operations.start = {
        runtimeId: webShared?.runtimeId ?? `actual-${theme.id}`,
        processes: startProcesses,
        ...(cleanupProcesses?.length ? { cleanup: cleanupProcesses } : {})
      };
      operations.stop = { mode: webShared ? 'release' : 'managed' };
    }
    if (requestDefinitions?.length) {
      operations.run = {
        mode: 'request',
        requests: requestDefinitions
      };
    } else if (requestDefinition) {
      operations.run = {
        mode: 'request',
        method: requestDefinition.method,
        url: requestDefinition.url,
        request: {
          ...(requestDefinition.headers ? { headers: requestDefinition.headers } : {}),
          ...(requestDefinition.body ? { body: requestDefinition.body } : {}),
          ...(requestDefinition.input ? { input: requestDefinition.input } : {})
        }
      };
    } else if (commandOperations?.length) {
      operations.run = {
        mode: 'command',
        commandOperations
      };
    } else if (commandProcesses) {
      operations.run = {
        mode: 'command',
        processes: commandProcesses
      };
    }
    return {
      id: theme.id,
      fieldId: theme.fieldId,
      name: theme.name,
      summary: theme.integrationStatus === 'connected'
        ? theme.connection?.type === 'static-web'
          ? '保存済みの静的Web教材を表示します。'
          : theme.connection?.type === 'web-process'
            ? '保存済みのWeb教材を起動して操作できます。'
            : theme.connection?.type === 'request-process'
              ? '保存済みのAPI教材を起動してリクエストできます。'
              : theme.connection?.type === 'request-stack'
                ? '保存済みのAPIと必要な実行環境を起動してリクエストできます。'
                : theme.connection?.type === 'command-one-shot'
                  ? '保存済みのコマンド教材を実行できます。'
                  : theme.connection?.type === 'command-stack'
                    ? '保存済みの複合環境を起動して教材を実行できます。'
                    : theme.connection?.type === 'web-stack'
                      ? '保存済みのWeb複合環境を起動して画面を操作できます。'
                      : theme.connection?.type === 'web-shared'
                        ? '保存済みの共有環境を起動し、このテーマの画面を操作できます。'
                        : theme.connection?.type === 'external-process'
                          ? '保存済みのデスクトップアプリを起動して操作できます。'
            : '保存済みの文書教材を表示します。'
        : '実教材のメタデータです。実行接続はまだ設定されていません。',
      presentation: theme.presentation,
      lifecycle: theme.lifecycle,
      material: {
        path: theme.entryFile,
        openMode: theme.integrationStatus === 'connected' && theme.presentation === 'web'
          ? theme.materialOpenMode ?? 'embedded'
          : 'none'
      },
      environment: {
        required: theme.lifecycle === 'manual'
          ? ['Docker Desktop', 'Git', 'Node.js']
          : requestStack
          ? ['Docker Desktop']
          : commandStack
            ? commandStack.environment
          : webStack
            ? webStack.environment
          : webShared
            ? webShared.environment
          : externalProcess
            ? externalProcess.environment
          : commandOneShot
            ? commandOneShot.environment ?? commandEnvironment(commandOneShot.commands
                ?? commandOneShot.operations?.flatMap((operation) => operation.processes)
                ?? [])
          : managedProcess
          ? commandEnvironment([managedProcess])
          : []
      },
      ...(groupByThemeId.has(theme.id) ? { group: groupByThemeId.get(theme.id)! } : {}),
      ...(listProfileByThemeId.has(theme.id) ? { listProfile: listProfileByThemeId.get(theme.id)! } : {}),
      operations,
      ...(requestStack
        ? { timeoutSeconds: 180 }
        : commandStack
          ? { timeoutSeconds: commandStack.timeoutSeconds }
        : webStack
          ? { timeoutSeconds: webStack.timeoutSeconds }
        : webShared
          ? { timeoutSeconds: webShared.timeoutSeconds }
        : externalProcess
          ? { timeoutSeconds: 30 }
        : commandOneShot
          ? { timeoutSeconds: commandOneShot.timeoutSeconds ?? 60 }
          : managedProcess
            ? { timeoutSeconds: 30 }
            : {}),
      integrationStatus: theme.integrationStatus,
      integrationMode: integrationMode(theme.presentation),
      entryFile: theme.entryFile,
      ...(theme.resources ? { resources: theme.resources } : {}),
      ...(theme.connection ? { actualConnection: theme.connection } : {})
    };
  });

  const fields: Field[] = fieldsFile.fields.map((field, index) => {
    resolveRepositoryFile(field.entryFile);
    return {
      id: field.id,
      name: field.name,
      summary: `${field.name}の保存済み教材を表示します。`,
      order: (index + 1) * 10,
      themeCount: themes.filter((theme) => theme.fieldId === field.id).length,
      entryFile: field.entryFile,
      check: validateActualFieldCheck(field)
    };
  });
  assertSafeOperationUrls(themes);
  const themeById = new Map(themes.map((theme) => [theme.id, theme]));
  const checklists = loadActualChecklists(themeById);

  return {
    mode: 'actual',
    fields,
    themes,
    themeById,
    checklists
  };
}

export function loadCatalogs(): Record<CatalogMode, Catalog> {
  return {
    sample: loadCatalog(),
    actual: loadActualCatalog()
  };
}
