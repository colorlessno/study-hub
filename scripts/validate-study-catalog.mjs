import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const catalogPath = path.join(root, 'catalog', 'fields.json')
const themeCatalogPath = path.join(root, 'catalog', 'themes.json')
const themeGroupPath = path.join(root, 'catalog', 'theme-groups.json')
const checklistDirectory = path.join(root, 'catalog', 'checklists')
const allowedKinds = new Set(['document', 'exercise', 'implementation', 'application', 'shared-environment', 'mixed'])
const allowedModes = new Set(['check-only', 'managed-check', 'manual-app'])
const allowedCommands = new Set(['node', 'npm', 'python'])
const standaloneConnectionTypes = new Set([
  'markdown',
  'static-web',
  'web-process',
  'external-process',
  'request-process',
  'request-stack',
  'web-shared',
  'command-one-shot',
  'command-stack',
  'web-stack'
])
const expectedConnectionTypes = new Map([
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
])
const sharedResourcePrefixes = new Map([
  ['study-devops', ['.github/workflows/']]
])
const formalDocumentDefinitions = [
  {
    id: 'requirements',
    label: '要件定義',
    kind: 'requirements',
    directory: 'requirements',
    matches(themeId, fileName) {
      return fileName.startsWith(`${themeId}_`)
        && fileName.endsWith('_requirements.md')
        && !fileName.endsWith('_requirements_index.md')
    }
  },
  {
    id: 'basic-design',
    label: '基本設計',
    kind: 'design',
    directory: 'basic_design',
    matches(themeId, fileName) {
      return fileName === `${themeId}_basic_design.md`
    }
  },
  {
    id: 'detailed-design',
    label: '詳細設計',
    kind: 'design',
    directory: 'detailed_design',
    matches(themeId, fileName) {
      return fileName === `${themeId}_detailed_design.md`
    }
  }
]

const errors = []
const ids = new Set()
const names = new Set()
const fieldPrefixes = new Set()
const themeDirectoryDefinitions = new Map()

async function readJson(filePath) {
  const relativePath = path.relative(root, filePath).replaceAll('\\', '/')
  try {
    const bytes = await readFile(filePath)
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return JSON.parse(text)
  } catch (error) {
    errors.push(`${relativePath}: UTF-8のJSONとして読み込めません (${error.message})`)
    return undefined
  }
}

async function readUtf8RepositoryFile(relativePath, owner) {
  const targetPath = resolveRepositoryPath(relativePath, owner)
  if (!targetPath) return undefined
  try {
    const bytes = await readFile(targetPath)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    errors.push(`${owner}: 厳密なUTF-8として読み込めません: ${relativePath} (${error.message})`)
    return undefined
  }
}

function resolveRepositoryPath(relativePath, owner) {
  if (typeof relativePath !== 'string'
    || relativePath.length === 0
    || relativePath.includes('\\')
    || path.isAbsolute(relativePath)
    || relativePath.split('/').includes('..')) {
    errors.push(`${owner}: リポジトリ相対パスではありません: ${relativePath ?? '(missing)'}`)
    return undefined
  }
  const targetPath = path.resolve(root, relativePath)
  if (targetPath !== root && !targetPath.startsWith(`${root}${path.sep}`)) {
    errors.push(`${owner}: リポジトリ外を参照しています: ${relativePath}`)
    return undefined
  }
  return targetPath
}

async function requirePath(relativePath, owner, expectedType = 'any') {
  const targetPath = resolveRepositoryPath(relativePath, owner)
  if (!targetPath) return
  try {
    const target = await stat(targetPath)
    if (expectedType === 'file' && !target.isFile()) errors.push(`${owner}: ファイルではありません: ${relativePath}`)
    if (expectedType === 'directory' && !target.isDirectory()) errors.push(`${owner}: フォルダーではありません: ${relativePath}`)
  } catch {
    errors.push(`${owner}: 参照先が存在しません: ${relativePath}`)
  }
}

async function listChildDirectories(relativePath, owner) {
  const targetPath = resolveRepositoryPath(relativePath, owner)
  if (!targetPath) return []
  try {
    return (await readdir(targetPath, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  } catch (error) {
    errors.push(`${owner}: フォルダー一覧を取得できません: ${relativePath} (${error.message})`)
    return []
  }
}

async function findFormalDocuments(theme, field, owner) {
  const documents = []
  for (const definition of formalDocumentDefinitions) {
    const relativeDirectory = `${field.path}/doc/${definition.directory}`
    const targetPath = resolveRepositoryPath(relativeDirectory, owner)
    if (!targetPath) continue
    let fileNames
    try {
      fileNames = (await readdir(targetPath, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && definition.matches(theme.id, entry.name))
        .map((entry) => entry.name)
    } catch (error) {
      errors.push(`${owner}: ${definition.label}フォルダーを読み取れません: ${relativeDirectory} (${error.message})`)
      continue
    }
    if (fileNames.length !== 1) {
      errors.push(`${owner}: ${definition.label}が一意ではありません: ${fileNames.join(', ') || '0件'}`)
      continue
    }
    documents.push({
      ...definition,
      format: 'markdown',
      path: `${relativeDirectory}/${fileNames[0]}`
    })
  }
  return documents
}

function requireFieldPlacement(relativePath, fields, owner, usedRelatedFieldIds, allowSharedResource = false) {
  if (typeof relativePath !== 'string' || fields.length === 0) return
  if (allowSharedResource) {
    const allowedPrefixes = sharedResourcePrefixes.get(fields[0].id) ?? []
    if (allowedPrefixes.some((prefix) => relativePath.startsWith(prefix))) return
  }
  const matchedField = fields.find((field) => (
    relativePath === field.path || relativePath.startsWith(`${field.path}/`)
  ))
  if (!matchedField) {
    errors.push(`${owner}: 許可された分野外を参照しています: ${relativePath}`)
    return
  }
  if (matchedField !== fields[0]) usedRelatedFieldIds?.add(matchedField.id)
}

function collectNestedPathValues(value, key, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectNestedPathValues(item, key, output)
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [currentKey, currentValue] of Object.entries(value)) {
    if (currentKey === key && typeof currentValue === 'string') output.push(currentValue)
    collectNestedPathValues(currentValue, key, output)
  }
}

function collectProcessDefinitions(value, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectProcessDefinitions(item, output)
    return
  }
  if (!value || typeof value !== 'object') return
  if (typeof value.command === 'string' && Array.isArray(value.args)) output.push(value)
  for (const currentValue of Object.values(value)) collectProcessDefinitions(currentValue, output)
}

async function isFile(relativePath) {
  const targetPath = resolveRepositoryPath(relativePath, relativePath)
  if (!targetPath) return false
  try {
    return (await stat(targetPath)).isFile()
  } catch {
    return false
  }
}

function resolveFromWorkingDirectory(cwd, relativePath, owner) {
  if (typeof relativePath !== 'string'
    || relativePath.length === 0
    || relativePath.includes('\\')
    || path.posix.isAbsolute(relativePath)
    || relativePath.split('/').includes('..')) {
    errors.push(`${owner}: 作業フォルダー相対パスではありません: ${relativePath ?? '(missing)'}`)
    return undefined
  }
  return path.posix.join(cwd, relativePath)
}

async function requireProcessEntry(processDefinition, cwd, owner) {
  const command = processDefinition.command
  const args = processDefinition.args
  if (processDefinition.allowFailure === true) return

  if (command === 'node') {
    if (args[0] === '-e' || args[0] === '--eval') return
    const script = args.find((argument) => /\.(cjs|js|mjs)$/u.test(argument))
    if (!script) return
    if (script.startsWith('node_modules/')) {
      const packagePath = path.posix.join(cwd, 'package.json')
      if (!await isFile(packagePath)) {
        errors.push(`${owner}: node_modules実行入口のpackage.jsonがありません: ${packagePath}`)
        return
      }
      const segments = script.split('/')
      const packageName = segments[1]?.startsWith('@')
        ? segments.slice(1, 3).join('/')
        : segments[1]
      const packageJson = await readJson(path.join(root, packagePath))
      const declaredDependencies = {
        ...packageJson?.dependencies,
        ...packageJson?.devDependencies,
        ...packageJson?.optionalDependencies
      }
      if (!packageName || declaredDependencies[packageName] === undefined) {
        errors.push(`${owner}: node_modules実行入口の依存packageが宣言されていません: ${packageName ?? script}`)
      }
      return
    }
    const scriptPath = resolveFromWorkingDirectory(cwd, script, owner)
    if (scriptPath) await requirePath(scriptPath, `${owner}.node`, 'file')
    return
  }

  if (command === 'python' || command === 'python-venv') {
    const script = args.find((argument) => /\.py$/u.test(argument) && !argument.includes('*'))
    if (!script) return
    const scriptPath = resolveFromWorkingDirectory(cwd, script, owner)
    if (scriptPath) await requirePath(scriptPath, `${owner}.${command}`, 'file')
    return
  }

  if (command === 'npm' || command === 'electron') {
    const packagePath = path.posix.join(cwd, 'package.json')
    if (!await isFile(packagePath)) {
      errors.push(`${owner}: ${command}のpackage.jsonがありません: ${packagePath}`)
      return
    }
    if (command === 'electron') return
    const packageJson = await readJson(path.join(root, packagePath))
    const scriptName = args[0] === 'run' ? args[1] : args[0]
    if (scriptName && packageJson?.scripts?.[scriptName] === undefined) {
      errors.push(`${owner}: npm scriptがpackage.jsonにありません: ${scriptName}`)
    }
    return
  }

  if (command === 'docker' && args[0] === 'compose') {
    const composeOptionIndex = args.indexOf('-f')
    if (composeOptionIndex >= 0) {
      const composeFile = args[composeOptionIndex + 1]
      if (composeFile === '-') {
        if (!processDefinition.stdinFile) errors.push(`${owner}: Docker Compose標準入力のstdinFileがありません`)
        return
      }
      const composePath = resolveFromWorkingDirectory(cwd, composeFile, owner)
      if (composePath) await requirePath(composePath, `${owner}.docker-compose`, 'file')
      return
    }
    const candidates = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml']
    for (const candidate of candidates) {
      if (await isFile(path.posix.join(cwd, candidate))) return
    }
    errors.push(`${owner}: Docker Compose定義が作業フォルダーにありません: ${cwd}`)
  }
}

const catalog = await readJson(catalogPath)
const themeCatalog = await readJson(themeCatalogPath)
const themeGroups = await readJson(themeGroupPath)

if (catalog?.schemaVersion !== 1) errors.push('fields.json: schemaVersion must be 1')
if (!Array.isArray(catalog?.fields) || catalog.fields.length === 0) errors.push('fields.json: fields must be a non-empty array')

for (const field of catalog?.fields ?? []) {
  if (!field.id || ids.has(field.id)) errors.push(`duplicate or missing id: ${field.id ?? '(missing)'}`)
  if (!field.name || names.has(field.name)) errors.push(`duplicate or missing name: ${field.name ?? '(missing)'}`)
  ids.add(field.id)
  names.add(field.name)

  if (!allowedKinds.has(field.unitKind)) errors.push(`${field.name}: invalid unitKind`)
  if (!allowedModes.has(field.lifecycle?.mode)) errors.push(`${field.name}: invalid lifecycle mode`)
  if (!Number.isInteger(field.numberedThemes) || field.numberedThemes < 0) errors.push(`${field.name}: invalid numberedThemes`)
  if (field.numberedThemes > 0) {
    if (typeof field.themePrefix !== 'string' || !/^[a-z]+$/u.test(field.themePrefix)) {
      errors.push(`${field.name}: 番号付きテーマのthemePrefixが不正です`)
    } else if (fieldPrefixes.has(field.themePrefix)) {
      errors.push(`${field.name}: themePrefixが重複しています: ${field.themePrefix}`)
    } else {
      fieldPrefixes.add(field.themePrefix)
    }
    const themeDirectories = field.themeDirectories
    const implementationRoots = themeDirectories?.implementationRoots
    if (typeof themeDirectories?.documentationRoot !== 'string'
      || !Array.isArray(implementationRoots)
      || implementationRoots.length === 0
      || implementationRoots.some((value) => typeof value !== 'string')) {
      errors.push(`${field.name}: 番号付きテーマのthemeDirectoriesが不正です`)
    } else {
      const configuredRoots = [themeDirectories.documentationRoot, ...implementationRoots]
      if (new Set(configuredRoots).size !== configuredRoots.length) {
        errors.push(`${field.name}: themeDirectoriesの配置ルートが重複しています`)
      }
      for (const [index, configuredRoot] of configuredRoots.entries()) {
        await requirePath(configuredRoot, `${field.name}.themeDirectories[${index}]`, 'directory')
        requireFieldPlacement(configuredRoot, [field], `${field.name}.themeDirectories[${index}]`)
      }
      themeDirectoryDefinitions.set(field.id, {
        documentationRoot: themeDirectories.documentationRoot,
        implementationRoots
      })
    }
  } else if (field.themePrefix !== undefined) {
    errors.push(`${field.name}: 番号体系外の分野にthemePrefixは指定できません`)
  } else if (field.themeDirectories !== undefined) {
    errors.push(`${field.name}: 番号体系外の分野にthemeDirectoriesは指定できません`)
  }

  await requirePath(field.path, `${field.name}.path`, 'directory')
  await requirePath(field.entryFile, `${field.name}.entryFile`, 'file')
  requireFieldPlacement(field.entryFile, [field], `${field.name}.entryFile`)

  const check = field.lifecycle?.check
  if (!check || !allowedCommands.has(check.command)) errors.push(`${field.name}: invalid check command`)
  if (!Array.isArray(check?.args) || check.args.some((value) => typeof value !== 'string')) {
    errors.push(`${field.name}: check args must be strings`)
  }
  if (!Number.isInteger(check?.timeoutSeconds) || check.timeoutSeconds < 10 || check.timeoutSeconds > 600) {
    errors.push(`${field.name}: timeoutSeconds must be between 10 and 600`)
  }
  if (field.lifecycle?.mode === 'managed-check' && field.lifecycle.managesCleanup !== true) {
    errors.push(`${field.name}: managed-check must declare managesCleanup`)
  }
  if (field.lifecycle?.mode === 'manual-app' && !field.lifecycle.startGuide) {
    errors.push(`${field.name}: manual-app must declare startGuide`)
  }
  if (field.lifecycle?.startGuide) {
    await requirePath(field.lifecycle.startGuide, `${field.name}.startGuide`, 'file')
    requireFieldPlacement(field.lifecycle.startGuide, [field], `${field.name}.startGuide`)
  }
}

const themeTotal = (catalog.fields ?? []).reduce((sum, field) => sum + (field.numberedThemes ?? 0), 0)
if (themeTotal !== catalog.numberedThemeCount || themeTotal !== 163) {
  errors.push(`numbered theme count must be 163, actual ${themeTotal}`)
}

const categoryDirectories = (await readdir(path.join(root, 'category'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('Study'))
  .map((entry) => entry.name)
  .sort()
const catalogNames = [...names].sort()
if (JSON.stringify(categoryDirectories) !== JSON.stringify(catalogNames)) {
  errors.push(`category/catalog mismatch: directories=${categoryDirectories.join(',')} catalog=${catalogNames.join(',')}`)
}

const fieldsById = new Map((catalog?.fields ?? []).map((field) => [field.id, field]))
const themes = Array.isArray(themeCatalog?.themes) ? themeCatalog.themes : []
const themesById = new Map(themes.map((theme) => [theme.id, theme]))
const themeIds = new Set()
const themeEntryFiles = new Map()
const themeEntryContentHashes = new Map()
const numberedThemeCounts = new Map()
const numberedThemeIds = new Map()
const connectionTypeCounts = new Map()
let processEntryCount = 0
let validatedThemeEntryCount = 0
let validatedFormalDocumentCount = 0

if (themeCatalog?.schemaVersion !== 1) errors.push('themes.json: schemaVersion must be 1')
if (themeCatalog?.themeCount !== 167 || themes.length !== 167) {
  errors.push(`themes.json: themeCountとthemesは167件である必要があります (themeCount=${themeCatalog?.themeCount}, themes=${themes.length})`)
}

for (const theme of themes) {
  const owner = `themes.json:${theme.id ?? '(missing)'}`
  if (!theme.id || themeIds.has(theme.id)) errors.push(`${owner}: theme idが未設定または重複しています`)
  themeIds.add(theme.id)

  const field = fieldsById.get(theme.fieldId)
  if (!field) errors.push(`${owner}: 未登録のfieldIdです: ${theme.fieldId ?? '(missing)'}`)
  const relatedFields = []
  const relatedFieldIds = new Set()
  for (const relatedFieldId of theme.relatedFieldIds ?? []) {
    if (relatedFieldId === theme.fieldId || relatedFieldIds.has(relatedFieldId)) {
      errors.push(`${owner}: relatedFieldIdsが自分自身を参照しているか重複しています: ${relatedFieldId}`)
      continue
    }
    const relatedField = fieldsById.get(relatedFieldId)
    if (!relatedField) errors.push(`${owner}: relatedFieldIdsに未登録のfieldIdがあります: ${relatedFieldId}`)
    else relatedFields.push(relatedField)
    relatedFieldIds.add(relatedFieldId)
  }
  const allowedFields = field ? [field, ...relatedFields] : relatedFields
  const usedRelatedFieldIds = new Set()
  if (field?.numberedThemes > 0) {
    const expectedIdPattern = new RegExp(`^${field.themePrefix}\\d{2}$`, 'u')
    if (!expectedIdPattern.test(theme.id ?? '')) {
      errors.push(`${owner}: ${field.name}のテーマIDは${field.themePrefix}01形式である必要があります`)
    }
    numberedThemeCounts.set(theme.fieldId, (numberedThemeCounts.get(theme.fieldId) ?? 0) + 1)
    const idsForField = numberedThemeIds.get(theme.fieldId) ?? new Set()
    idsForField.add(theme.id)
    numberedThemeIds.set(theme.fieldId, idsForField)
    if (typeof theme.entryFile === 'string'
      && !theme.entryFile.split('/').some((segment) => segment.startsWith(`${theme.id}_`))) {
      errors.push(`${owner}: entryFileのフォルダー名にテーマIDがありません: ${theme.entryFile}`)
    }
  } else if (/\d+$/u.test(theme.id ?? '')) {
    errors.push(`${owner}: 番号体系外の分野で番号付きテーマIDを使用しています`)
  }

  await requirePath(theme.entryFile, `${owner}.entryFile`, 'file')
  requireFieldPlacement(theme.entryFile, allowedFields, `${owner}.entryFile`, usedRelatedFieldIds)
  if (themeEntryFiles.has(theme.entryFile)) {
    errors.push(`${owner}: entryFileが${themeEntryFiles.get(theme.entryFile)}と重複しています: ${theme.entryFile}`)
  } else if (typeof theme.entryFile === 'string') {
    themeEntryFiles.set(theme.entryFile, theme.id)
  }
  const entryText = await readUtf8RepositoryFile(theme.entryFile, `${owner}.entryFile`)
  if (entryText !== undefined) {
    const contentHash = createHash('sha256').update(entryText, 'utf8').digest('hex')
    if (themeEntryContentHashes.has(contentHash)) {
      errors.push(`${owner}: 入口文書の内容が${themeEntryContentHashes.get(contentHash)}と完全に重複しています`)
    } else {
      themeEntryContentHashes.set(contentHash, theme.id)
    }
    validatedThemeEntryCount += 1
  }

  if (field?.numberedThemes > 0) {
    const formalDocuments = await findFormalDocuments(theme, field, owner)
    for (const formalDocument of formalDocuments) {
      const matchingResources = (theme.resources ?? [])
        .filter((resource) => resource.id === formalDocument.id)
      if (matchingResources.length !== 1) {
        errors.push(`${owner}: ${formalDocument.label}のresourceを1件登録してください`)
        continue
      }
      const resource = matchingResources[0]
      if (resource.label !== formalDocument.label
        || resource.kind !== formalDocument.kind
        || resource.format !== formalDocument.format
        || resource.path !== formalDocument.path) {
        errors.push(`${owner}: ${formalDocument.label}のresource定義が正式文書と一致しません`)
        continue
      }
      const formalText = await readUtf8RepositoryFile(formalDocument.path, `${owner}.${formalDocument.id}`)
      if (formalText !== undefined) validatedFormalDocumentCount += 1
    }
  }

  for (const resource of theme.resources ?? []) {
    await requirePath(resource.path, `${owner}.resources.${resource.id ?? '(missing)'}`, 'file')
    requireFieldPlacement(
      resource.path,
      allowedFields,
      `${owner}.resources.${resource.id ?? '(missing)'}`,
      usedRelatedFieldIds,
      true
    )
  }

  const connection = theme.connection
  if (theme.integrationStatus === 'connected' && !connection) errors.push(`${owner}: connectedテーマにconnectionがありません`)
  if (!connection) continue
  const behavior = `${theme.presentation}/${theme.lifecycle}`
  const expectedConnectionType = expectedConnectionTypes.get(behavior)
  if (!expectedConnectionType) {
    errors.push(`${owner}: 未定義の画面動作です: ${behavior}`)
  } else if (connection.type !== expectedConnectionType) {
    errors.push(`${owner}: ${behavior}のconnection.typeは${expectedConnectionType}である必要があります`)
  }
  connectionTypeCounts.set(connection.type, (connectionTypeCounts.get(connection.type) ?? 0) + 1)
  if (!standaloneConnectionTypes.has(connection.type)) {
    errors.push(`${owner}: 単体利用方法を判定できないconnection.typeです: ${connection.type ?? '(missing)'}`)
  }
  if (connection.type === 'markdown' && connection.file !== theme.entryFile) {
    errors.push(`${owner}: 文書テーマのconnection.fileはentryFileと一致する必要があります`)
  }

  if (connection.cwd) {
    await requirePath(connection.cwd, `${owner}.connection.cwd`, 'directory')
    requireFieldPlacement(connection.cwd, allowedFields, `${owner}.connection.cwd`, usedRelatedFieldIds)
  }
  if (connection.file) {
    await requirePath(connection.file, `${owner}.connection.file`, 'file')
    requireFieldPlacement(connection.file, allowedFields, `${owner}.connection.file`, usedRelatedFieldIds)
  }
  if (connection.root) {
    await requirePath(connection.root, `${owner}.connection.root`, 'directory')
    requireFieldPlacement(connection.root, allowedFields, `${owner}.connection.root`, usedRelatedFieldIds)
    if (connection.entryFile) {
      await requirePath(`${connection.root}/${connection.entryFile}`, `${owner}.connection.entryFile`, 'file')
    }
  }

  if (connection.cwd) {
    const processDefinitions = []
    collectProcessDefinitions(connection, processDefinitions)
    for (const [index, processDefinition] of processDefinitions.entries()) {
      await requireProcessEntry(processDefinition, connection.cwd, `${owner}.processes[${index}]`)
      processEntryCount += 1
    }
  }

  const stdinFiles = []
  collectNestedPathValues(connection, 'stdinFile', stdinFiles)
  for (const stdinFile of stdinFiles) {
    await requirePath(stdinFile, `${owner}.connection.stdinFile`, 'file')
    requireFieldPlacement(stdinFile, allowedFields, `${owner}.connection.stdinFile`, usedRelatedFieldIds)
  }
  for (const relatedFieldId of relatedFieldIds) {
    if (!usedRelatedFieldIds.has(relatedFieldId)) {
      errors.push(`${owner}: relatedFieldIdsの${relatedFieldId}は実際の参照先に使われていません`)
    }
  }
}

for (const field of catalog?.fields ?? []) {
  const actualCount = numberedThemeCounts.get(field.id) ?? 0
  if (actualCount !== field.numberedThemes) {
    errors.push(`${field.name}: numberedThemes=${field.numberedThemes}ですがthemes.jsonには${actualCount}件あります`)
  }
  if (field.numberedThemes > 0) {
    const actualIds = numberedThemeIds.get(field.id) ?? new Set()
    for (let number = 1; number <= field.numberedThemes; number += 1) {
      const expectedId = `${field.themePrefix}${String(number).padStart(2, '0')}`
      if (!actualIds.has(expectedId)) errors.push(`${field.name}: 番号付きテーマがありません: ${expectedId}`)
    }
  }
}

let documentationDirectoryCount = 0
let implementationDirectoryCount = 0
for (const field of catalog?.fields ?? []) {
  if (field.numberedThemes === 0) continue
  const directoryDefinition = themeDirectoryDefinitions.get(field.id)
  if (!directoryDefinition) continue
  const expectedThemeIds = numberedThemeIds.get(field.id) ?? new Set()
  const directoryPattern = new RegExp(`^(${field.themePrefix}\\d{2})_[a-z0-9]+(?:_[a-z0-9]+)*$`, 'u')
  const documentationDirectories = await listChildDirectories(
    directoryDefinition.documentationRoot,
    `${field.name}.themeDirectories.documentationRoot`
  )
  const documentedThemeIds = new Set()

  for (const directoryName of documentationDirectories) {
    const match = directoryName.match(directoryPattern)
    if (!match) {
      errors.push(`${field.name}: 文書配置ルートに命名規則外のフォルダーがあります: ${directoryName}`)
      continue
    }
    const themeId = match[1]
    if (!expectedThemeIds.has(themeId)) {
      errors.push(`${field.name}: 未登録テーマの文書フォルダーがあります: ${directoryName}`)
      continue
    }
    if (documentedThemeIds.has(themeId)) {
      errors.push(`${field.name}: テーマ文書フォルダーが重複しています: ${themeId}`)
    }
    documentedThemeIds.add(themeId)
  }
  for (const themeId of expectedThemeIds) {
    if (!documentedThemeIds.has(themeId)) {
      errors.push(`${field.name}: テーマ文書フォルダーがありません: ${themeId}`)
    }
  }
  documentationDirectoryCount += documentationDirectories.length

  for (const theme of themes.filter((item) => item.fieldId === field.id)) {
    const relativeEntry = path.posix.relative(directoryDefinition.documentationRoot, theme.entryFile)
    const entrySegments = relativeEntry.split('/')
    if (entrySegments.length !== 2 || !entrySegments[0].startsWith(`${theme.id}_`)) {
      errors.push(`themes.json:${theme.id}: entryFileが分野の文書配置規則に適合しません: ${theme.entryFile}`)
    }
  }

  for (const implementationRoot of directoryDefinition.implementationRoots) {
    const implementationDirectories = await listChildDirectories(
      implementationRoot,
      `${field.name}.themeDirectories.implementationRoots`
    )
    for (const directoryName of implementationDirectories) {
      const match = directoryName.match(directoryPattern)
      if (!match && directoryName.startsWith(field.themePrefix)) {
        errors.push(`${field.name}: 実装配置ルートに命名規則外のフォルダーがあります: ${implementationRoot}/${directoryName}`)
      } else if (match && !expectedThemeIds.has(match[1])) {
        errors.push(`${field.name}: 未登録テーマの実装フォルダーがあります: ${implementationRoot}/${directoryName}`)
      }
      if (match) implementationDirectoryCount += 1
    }
  }
}

const aliasThemeIds = new Set()
for (const theme of themes) {
  const owner = `themes.json:${theme.id ?? '(missing)'}`
  if (!theme.aliasOf) {
    if (typeof theme.name === 'string' && theme.name.includes('正規テーマは')) {
      errors.push(`${owner}: 統合先を示す名前にはaliasOfが必要です`)
    }
    continue
  }
  aliasThemeIds.add(theme.id)
  const target = themesById.get(theme.aliasOf)
  if (!target) {
    errors.push(`${owner}: aliasOfの統合先テーマがありません: ${theme.aliasOf}`)
    continue
  }
  if (target.id === theme.id || target.aliasOf) {
    errors.push(`${owner}: aliasOfは自分自身または別の案内入口を参照できません`)
  }
  if (!(theme.relatedFieldIds ?? []).includes(target.fieldId)) {
    errors.push(`${owner}: aliasOfの分野${target.fieldId}をrelatedFieldIdsへ指定してください`)
  }
  if (!(theme.resources ?? []).some((resource) => resource.path === target.entryFile)) {
    errors.push(`${owner}: 案内入口のresourcesに統合先${target.id}のentryFileを指定してください`)
  }
  if (theme.presentation !== 'document' || theme.lifecycle !== 'none' || theme.connection?.type !== 'markdown') {
    errors.push(`${owner}: 案内入口は起動処理を持たない文書テーマである必要があります`)
  }
}

for (const theme of themes) {
  for (const resource of theme.resources ?? []) {
    const referencedThemeId = themeEntryFiles.get(resource.path)
    if (referencedThemeId && theme.aliasOf !== referencedThemeId) {
      errors.push(`themes.json:${theme.id}: 別テーマ${referencedThemeId}の入口文書を参照しています。案内入口ならaliasOfを指定してください`)
    }
  }
}

const checklistFiles = (await readdir(checklistDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('_check.json'))
  .map((entry) => entry.name)
  .sort()
const checklistThemeIds = new Set()

for (const fileName of checklistFiles) {
  const expectedThemeId = fileName.slice(0, -'_check.json'.length)
  const checklist = await readJson(path.join(checklistDirectory, fileName))
  if (!checklist) continue
  if (checklist.themeId !== expectedThemeId) {
    errors.push(`catalog/checklists/${fileName}: themeIdは${expectedThemeId}である必要があります`)
  }
  if (!themeIds.has(checklist.themeId)) errors.push(`catalog/checklists/${fileName}: 未登録テーマです: ${checklist.themeId}`)
  if (checklistThemeIds.has(checklist.themeId)) errors.push(`catalog/checklists/${fileName}: themeIdが重複しています: ${checklist.themeId}`)
  checklistThemeIds.add(checklist.themeId)
  if (checklist.schemaVersion !== 1 || !Number.isInteger(checklist.revision) || checklist.revision < 1) {
    errors.push(`catalog/checklists/${fileName}: schemaVersionまたはrevisionが不正です`)
  }
  if (!Array.isArray(checklist.items) || checklist.items.length === 0) {
    errors.push(`catalog/checklists/${fileName}: itemsがありません`)
    continue
  }
  const itemIds = new Set()
  for (const item of checklist.items) {
    if (!item.id || itemIds.has(item.id)) errors.push(`catalog/checklists/${fileName}: item idが未設定または重複しています`)
    if (typeof item.label !== 'string' || item.label.trim().length === 0) errors.push(`catalog/checklists/${fileName}: 空のlabelがあります`)
    itemIds.add(item.id)
  }
}

for (const themeId of themeIds) {
  if (!checklistThemeIds.has(themeId)) errors.push(`catalog/checklists: ${themeId}_check.jsonがありません`)
}
if (checklistFiles.length !== themeIds.size) {
  errors.push(`catalog/checklists: テーマ${themeIds.size}件に対して学習項目設定が${checklistFiles.length}件あります`)
}

const groupedThemeIds = new Set()
const groupIds = new Set()
if (themeGroups?.schemaVersion !== 1 || !Array.isArray(themeGroups?.groups)) {
  errors.push('theme-groups.json: schemaVersionまたはgroupsが不正です')
}
for (const group of themeGroups?.groups ?? []) {
  const owner = `theme-groups.json:${group.id ?? '(missing)'}`
  if (!group.id || groupIds.has(group.id)) errors.push(`${owner}: group idが未設定または重複しています`)
  groupIds.add(group.id)
  if (!fieldsById.has(group.fieldId)) errors.push(`${owner}: 未登録のfieldIdです: ${group.fieldId}`)
  for (const themeId of group.themeIds ?? []) {
    const theme = themes.find((item) => item.id === themeId)
    if (!theme) errors.push(`${owner}: 未登録テーマです: ${themeId}`)
    else if (theme.fieldId !== group.fieldId) errors.push(`${owner}: ${themeId}のfieldIdと一致しません`)
    if (groupedThemeIds.has(themeId)) errors.push(`${owner}: ${themeId}が複数グループに登録されています`)
    groupedThemeIds.add(themeId)
  }
}
for (const themeId of themeIds) {
  if (!groupedThemeIds.has(themeId)) errors.push(`theme-groups.json: ${themeId}がグループに登録されていません`)
}

const profileThemeIds = new Set()
for (const profile of themeGroups?.profiles ?? []) {
  if (!themeIds.has(profile.themeId)) errors.push(`theme-groups.json.profiles: 未登録テーマです: ${profile.themeId}`)
  if (profileThemeIds.has(profile.themeId)) errors.push(`theme-groups.json.profiles: themeIdが重複しています: ${profile.themeId}`)
  profileThemeIds.add(profile.themeId)
}

const utf8Files = [
  'THEME_CATALOG.md',
  'catalog/README.md',
  'catalog/fields.schema.json',
  'catalog/themes.schema.json',
  'scripts/generate-theme-catalog.mjs',
  'scripts/validate-study-catalog.mjs'
]
const localWorkRecord = 'study-hub/docs/theme-screen-keyed-improvement-list.md'
try {
  await stat(path.join(root, localWorkRecord))
  utf8Files.push(localWorkRecord)
} catch {
  // ローカル限定の作業記録は公開リポジトリに存在しなくてもよい。
}
for (const relativePath of utf8Files) {
  try {
    const bytes = await readFile(path.join(root, relativePath))
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    errors.push(`${relativePath}: 厳密なUTF-8として読み込めません (${error.message})`)
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

const connectionSummary = [...connectionTypeCounts]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([type, count]) => `${type}=${count}`)
  .join(', ')
console.log(`Study structure passed: ${catalog.fields.length} fields, ${themes.length} themes, ${checklistFiles.length} checklists, ${themeGroups.groups.length} groups, ${aliasThemeIds.size} aliases`)
console.log(`Standalone connections: ${connectionSummary}`)
console.log(`Standalone process entries: ${processEntryCount}`)
console.log(`Theme directories: documentation=${documentationDirectoryCount}, implementation=${implementationDirectoryCount}`)
console.log(`Theme entry documents: utf8=${validatedThemeEntryCount}, duplicate-content=0`)
console.log(`Theme formal documents: utf8=${validatedFormalDocumentCount}, requirements=163, basic-design=163, detailed-design=163`)
