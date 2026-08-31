import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const studyDbRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const repositoryRoot = path.resolve(studyDbRoot, '..', '..')
const composeFile = path.join(studyDbRoot, 'src', 'apps', 'common', 'docker-compose.yml')
const project = `studydb_validation_${process.pid}`
const composePrefix = ['compose', '-p', project, '-f', composeFile]
const dockerEnvironment = { ...process.env, STUDYDB_PORT: '0' }
const executableTopics = new Set(['db02', 'db04', 'db05', 'db06'])
const supportedTopics = new Set(['db01', 'db03', 'db07', ...executableTopics])
const requestedTopics = process.argv.slice(2)

for (const topic of requestedTopics) {
  if (!supportedTopics.has(topic)) {
    throw new Error(`Unknown topic: ${topic}. Choose db01, db02, db03, db04, db05, db06, or db07.`)
  }
}

const shouldValidate = (topic) => requestedTopics.length === 0 || requestedTopics.includes(topic)
const shouldUseDocker = requestedTopics.length === 0 || requestedTopics.some((topic) => executableTopics.has(topic))
const validatedTopics = []

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    env: dockerEnvironment,
    maxBuffer: 16 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`docker ${args.join(' ')} failed\n${output}`)
  }
  return { status: result.status, output }
}

function compose(...args) {
  return runDocker([...composePrefix, ...args])
}

function psqlFile(topicDirectory, sqlPath, database = 'studydb') {
  return compose(
    'exec', '-T', 'db',
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database,
    '-f', `/work/${topicDirectory}/${sqlPath}`,
  )
}

function query(sql, database = 'studydb', allowFailure = false) {
  return runDocker([
    ...composePrefix,
    'exec', '-T', 'db',
    'psql', '-v', 'ON_ERROR_STOP=1', '-At', '-U', 'postgres', '-d', database,
    '-c', sql,
  ], { allowFailure })
}

function scalar(sql, database = 'studydb') {
  return query(sql, database).output.trim().split(/\r?\n/)[0]
}

function section(title) {
  console.log(`\n[StudyDB] ${title}`)
}

function readUtf8(filePath) {
  const content = fs.readFileSync(filePath)
  assert.notDeepEqual([...content.subarray(0, 3)], [0xef, 0xbb, 0xbf], `${filePath} must not have a UTF-8 BOM`)
  return new TextDecoder('utf-8', { fatal: true }).decode(content)
}

if (shouldValidate('db01')) {
  section('db01 documents and selection worksheet')
  const learningRoot = path.join(studyDbRoot, 'doc', 'learning_notes', 'db01_db_foundations')
  const files = [
    'README.md',
    'docs/storage_comparison.md',
    'docs/db_category_matrix.md',
    'docs/use_case_mapping.md',
    'docs/storage_selection_worksheet.md',
  ]
  for (const file of files) {
    const filePath = path.join(learningRoot, file)
    assert.ok(fs.existsSync(filePath), `${file} must exist`)
    assert.doesNotMatch(readUtf8(filePath), /同時|並列/, `${file} must describe sequential handling`)
  }
  const readme = readUtf8(path.join(learningRoot, 'README.md'))
  const worksheet = readUtf8(path.join(learningRoot, 'docs', 'storage_selection_worksheet.md'))
  assert.match(readme, /正本、派生データ、一時データ/)
  assert.match(readme, /選定結果を記入する/)
  assert.doesNotMatch(readme, /完了条件|学習完了の目安|資料を見る前の確認問題/)
  assert.match(worksheet, /注文履歴を正確に残す/)
  assert.match(worksheet, /障害時の復元元/)
  validatedTopics.push('db01')
}

if (shouldValidate('db03')) {
  section('db03 normalization, ER modeling, and design record')
  const learningRoot = path.join(studyDbRoot, 'doc', 'learning_notes', 'db03_normalization_er_modeling')
  const files = [
    path.join(studyDbRoot, 'doc', 'requirements', 'db03_normalization_er_modeling_requirements.md'),
    path.join(studyDbRoot, 'doc', 'basic_design', 'db03_basic_design.md'),
    path.join(studyDbRoot, 'doc', 'detailed_design', 'db03_detailed_design.md'),
    path.join(learningRoot, 'README.md'),
    path.join(learningRoot, 'docs', 'unnormalized_order_table.md'),
    path.join(learningRoot, 'docs', 'normalization_steps.md'),
    path.join(learningRoot, 'docs', 'er_model.md'),
    path.join(learningRoot, 'docs', 'denormalization_notes.md'),
    path.join(learningRoot, 'docs', 'db03_completion_check.md'),
    path.join(repositoryRoot, 'catalog', 'checklists', 'db03_check.json'),
  ]
  for (const file of files) {
    assert.ok(fs.existsSync(file), `${file} must exist`)
    assert.doesNotMatch(readUtf8(file), /同時|並列/, `${file} must describe sequential handling`)
  }
  const learningReadme = readUtf8(path.join(learningRoot, 'README.md'))
  const designRecord = readUtf8(path.join(learningRoot, 'docs', 'db03_completion_check.md'))
  assert.match(learningReadme, /設計結果を記録する/)
  assert.match(learningReadme, /別名のUTF-8 Markdownファイル/)
  assert.match(designRecord, /正規化の判断/)
  assert.match(designRecord, /ER表/)
  assert.match(designRecord, /逆正規化の判断/)
  validatedTopics.push('db03')
}

if (shouldValidate('db07')) {
  section('db07 datastore comparison and selection record')
  const learningRoot = path.join(studyDbRoot, 'doc', 'learning_notes', 'db07_nosql_cache_search_dwh')
  const files = [
    path.join(studyDbRoot, 'doc', 'requirements', 'db07_nosql_cache_search_dwh_requirements.md'),
    path.join(studyDbRoot, 'doc', 'basic_design', 'db07_basic_design.md'),
    path.join(studyDbRoot, 'doc', 'detailed_design', 'db07_detailed_design.md'),
    path.join(learningRoot, 'README.md'),
    path.join(learningRoot, 'docs', 'datastore_comparison.md'),
    path.join(learningRoot, 'docs', 'customer_order_model_variants.md'),
    path.join(learningRoot, 'docs', 'cache_search_dwh_notes.md'),
    path.join(learningRoot, 'docs', 'vector_db_rag_notes.md'),
    path.join(learningRoot, 'docs', 'db07_completion_check.md'),
    path.join(learningRoot, 'samples', 'customer_order_rdb.sql'),
    path.join(learningRoot, 'samples', 'customer_order_document.json'),
    path.join(learningRoot, 'samples', 'customer_order_key_value.json'),
    path.join(learningRoot, 'samples', 'sales_event_dwh.csv'),
    path.join(learningRoot, 'samples', 'rag_document_embedding_example.json'),
    path.join(repositoryRoot, 'catalog', 'checklists', 'db07_check.json'),
  ]
  for (const file of files) {
    assert.ok(fs.existsSync(file), `${file} must exist`)
    assert.doesNotMatch(readUtf8(file), /同時|並列/, `${file} must describe sequential handling`)
  }
  const learningReadme = readUtf8(path.join(learningRoot, 'README.md'))
  const selectionRecord = readUtf8(path.join(learningRoot, 'docs', 'db07_completion_check.md'))
  const documentSample = JSON.parse(readUtf8(path.join(learningRoot, 'samples', 'customer_order_document.json')))
  const keyValueSample = JSON.parse(readUtf8(path.join(learningRoot, 'samples', 'customer_order_key_value.json')))
  const ragSample = JSON.parse(readUtf8(path.join(learningRoot, 'samples', 'rag_document_embedding_example.json')))
  const dwhRows = readUtf8(path.join(learningRoot, 'samples', 'sales_event_dwh.csv')).trim().split(/\r?\n/)
  assert.match(learningReadme, /選定判断の記録ひな形/)
  assert.match(learningReadme, /ブラウザー内へ保存しません/)
  assert.match(selectionRecord, /正本/)
  assert.match(selectionRecord, /更新・再作成方法/)
  assert.equal(documentSample.order_id, 1001)
  assert.equal(keyValueSample.key, 'cart:sample-user-001')
  assert.ok(Number.isInteger(keyValueSample.ttl_seconds))
  assert.equal(ragSample.document_id, 'doc-001')
  assert.ok(Array.isArray(ragSample.embedding))
  assert.equal(dwhRows[0], 'event_date,region,product_category,amount')
  assert.equal(dwhRows.length, 3)
  validatedTopics.push('db07')
}

try {
  if (shouldUseDocker) {
    section('start isolated PostgreSQL')
    compose('up', '-d', '--wait', '--wait-timeout', '30', 'db')
  }

  if (shouldValidate('db02')) {
    section('db02 schema, CRUD, joins, and constraint rejection')
    const applicationRoot = path.join(studyDbRoot, 'src', 'apps', 'db02_sql_crud_schema')
    const learningRoot = path.join(studyDbRoot, 'doc', 'learning_notes', 'db02_sql_crud_schema')
    const documentFiles = [
      path.join(studyDbRoot, 'doc', 'requirements', 'db02_sql_crud_schema_requirements.md'),
      path.join(studyDbRoot, 'doc', 'basic_design', 'db02_basic_design.md'),
      path.join(studyDbRoot, 'doc', 'detailed_design', 'db02_detailed_design.md'),
      path.join(applicationRoot, 'README.md'),
      path.join(applicationRoot, 'sql', '001_schema.sql'),
      path.join(applicationRoot, 'sql', '002_seed.sql'),
      path.join(applicationRoot, 'sql', '003_crud_examples.sql'),
      path.join(applicationRoot, 'sql', '004_join_examples.sql'),
      path.join(applicationRoot, 'sql', '005_constraint_errors.sql'),
      path.join(learningRoot, 'README.md'),
      path.join(learningRoot, 'docs', 'schema_notes.md'),
      path.join(learningRoot, 'docs', 'command_log.md'),
      path.join(learningRoot, 'docs', 'constraint_error_notes.md'),
      path.join(repositoryRoot, 'catalog', 'checklists', 'db02_check.json'),
    ]
    for (const file of documentFiles) {
      assert.ok(fs.existsSync(file), `${file} must exist`)
      assert.doesNotMatch(readUtf8(file), /同時|並列/, `${file} must describe sequential handling`)
    }
    const commandRunner = readUtf8(path.join(studyDbRoot, 'src', 'apps', 'common', 'scripts', 'run-sql.cmd'))
    const applicationReadme = readUtf8(path.join(applicationRoot, 'README.md'))
    const learningReadme = readUtf8(path.join(learningRoot, 'README.md'))
    assert.match(commandRunner, /compose-project/)
    assert.match(applicationReadme, /studyhub-db02/)
    assert.match(applicationReadme, /down --volumes --remove-orphans/)
    assert.match(learningReadme, /スキーマと初期データを準備/)
    assert.match(learningReadme, /同じメールアドレスの重複/)
    assert.doesNotMatch(learningReadme, /完了条件|学習完了の目安|資料を見る前の確認問題|コードを読む順番|壊して直す演習/)

    psqlFile('db02_sql_crud_schema', 'sql/001_schema.sql')
    psqlFile('db02_sql_crud_schema', 'sql/002_seed.sql')
    psqlFile('db02_sql_crud_schema', 'sql/003_crud_examples.sql')
    psqlFile('db02_sql_crud_schema', 'sql/004_join_examples.sql')
    assert.equal(scalar('SELECT count(*) FROM db02.customers;'), '3')
    assert.equal(scalar('SELECT count(*) FROM db02.products;'), '4')
    assert.equal(scalar('SELECT count(*) FROM db02.orders;'), '3')
    assert.equal(scalar('SELECT count(*) FROM db02.order_items;'), '4')
    assert.equal(scalar("SELECT price FROM db02.products WHERE name = 'Notebook';"), '900.00')
    assert.equal(scalar('SELECT count(*) FROM db02.orders o INNER JOIN db02.order_items oi ON oi.order_id = o.id;'), '4')
    assert.equal(scalar('SELECT count(*) FROM db02.customers c LEFT JOIN db02.orders o ON o.customer_id = c.id;'), '4')

    const rejectedStatements = [
      ["INSERT INTO db02.customers (name, email) VALUES ('Duplicate', 'customer-a@example.test');", 'duplicate email'],
      ["INSERT INTO db02.customers (name, email) VALUES (NULL, 'missing-name@example.test');", 'missing name'],
      ["INSERT INTO db02.orders (customer_id, status) VALUES (9999, 'created');", 'missing customer'],
      ["INSERT INTO db02.products (name, price) VALUES ('Invalid Price', -1);", 'negative price'],
      ['INSERT INTO db02.order_items (order_id, product_id, quantity, unit_price) VALUES (1, 1, 0, 800.00);', 'zero quantity'],
    ]
    for (const [sql, label] of rejectedStatements) {
      const result = query(sql, 'studydb', true)
      assert.notEqual(result.status, 0, `${label} must be rejected`)
    }
    validatedTopics.push('db02')
  }

  if (shouldValidate('db04')) {
    section('db04 commit, rollback, lock observation, and isolation state')
    const applicationRoot = path.join(studyDbRoot, 'src', 'apps', 'db04_transaction_lock_isolation')
    const learningRoot = path.join(studyDbRoot, 'doc', 'learning_notes', 'db04_transaction_lock_isolation')
    const files = [
      path.join(studyDbRoot, 'doc', 'requirements', 'db04_transaction_lock_isolation_requirements.md'),
      path.join(studyDbRoot, 'doc', 'basic_design', 'db04_basic_design.md'),
      path.join(studyDbRoot, 'doc', 'detailed_design', 'db04_detailed_design.md'),
      path.join(applicationRoot, 'README.md'),
      path.join(applicationRoot, 'sql', '001_schema.sql'),
      path.join(applicationRoot, 'sql', '002_seed.sql'),
      path.join(applicationRoot, 'sql', '003_commit_rollback.sql'),
      path.join(applicationRoot, 'sql', '004_concurrent_update_session_a.sql'),
      path.join(applicationRoot, 'sql', '005_concurrent_update_session_b.sql'),
      path.join(applicationRoot, 'sql', '006_isolation_observation.sql'),
      path.join(applicationRoot, 'scripts', 'lock-conflict-demo.mjs'),
      path.join(learningRoot, 'README.md'),
      path.join(learningRoot, 'docs', 'transaction_log.md'),
      path.join(learningRoot, 'docs', 'concurrent_update_log.md'),
      path.join(learningRoot, 'docs', 'isolation_matrix.md'),
      path.join(repositoryRoot, 'catalog', 'checklists', 'db04_check.json'),
    ]
    for (const file of files) {
      assert.ok(fs.existsSync(file), `${file} must exist`)
      assert.doesNotMatch(readUtf8(file), /同時|並列|2つのpsqlセッション|2セッション/, `${file} must describe one sequential session`)
    }
    const applicationReadme = readUtf8(path.join(applicationRoot, 'README.md'))
    assert.match(applicationReadme, /studyhub-db04/)
    assert.match(applicationReadme, /down --volumes --remove-orphans/)
    psqlFile('db04_transaction_lock_isolation', 'sql/001_schema.sql')
    psqlFile('db04_transaction_lock_isolation', 'sql/002_seed.sql')
    psqlFile('db04_transaction_lock_isolation', 'sql/003_commit_rollback.sql')
    psqlFile('db04_transaction_lock_isolation', 'sql/004_concurrent_update_session_a.sql')
    psqlFile('db04_transaction_lock_isolation', 'sql/005_concurrent_update_session_b.sql')
    psqlFile('db04_transaction_lock_isolation', 'sql/006_isolation_observation.sql')
    const lockObservation = spawnSync(process.execPath, [
      path.join(applicationRoot, 'scripts', 'lock-conflict-demo.mjs'),
    ], {
      cwd: studyDbRoot,
      encoding: 'utf8',
      env: { ...dockerEnvironment, STUDYDB_COMPOSE_PROJECT: project },
      maxBuffer: 16 * 1024 * 1024,
    })
    assert.equal(lockObservation.status, 0, `${lockObservation.stdout}${lockObservation.stderr}`)
    assert.match(lockObservation.stdout, /RowExclusiveLock/)
    assert.equal(scalar('SELECT stock FROM db04.products WHERE id = 1;'), '8')
    assert.equal(scalar('SELECT stock FROM db04.products WHERE id = 2;'), '100')
    assert.equal(scalar('SELECT count(*) FROM db04.orders;'), '1')
    validatedTopics.push('db04')
  }

  if (shouldValidate('db05')) {
    section('db05 EXPLAIN before and after indexes')
    const applicationRoot = path.join(studyDbRoot, 'src', 'apps', 'db05_index_explain_performance')
    const learningRoot = path.join(studyDbRoot, 'doc', 'learning_notes', 'db05_index_explain_performance')
    const files = [
      path.join(studyDbRoot, 'doc', 'requirements', 'db05_index_explain_performance_requirements.md'),
      path.join(studyDbRoot, 'doc', 'basic_design', 'db05_basic_design.md'),
      path.join(studyDbRoot, 'doc', 'detailed_design', 'db05_detailed_design.md'),
      path.join(applicationRoot, 'README.md'),
      path.join(applicationRoot, 'sql', '001_schema.sql'),
      path.join(applicationRoot, 'sql', '002_seed_small.sql'),
      path.join(applicationRoot, 'sql', '003_seed_large.sql'),
      path.join(applicationRoot, 'sql', '004_explain_without_index.sql'),
      path.join(applicationRoot, 'sql', '005_create_indexes.sql'),
      path.join(applicationRoot, 'sql', '006_explain_with_index.sql'),
      path.join(applicationRoot, 'sql', '007_ineffective_index_examples.sql'),
      path.join(learningRoot, 'README.md'),
      path.join(learningRoot, 'docs', 'explain_log.md'),
      path.join(learningRoot, 'docs', 'performance_observation.md'),
      path.join(learningRoot, 'docs', 'studyweb_relation.md'),
      path.join(repositoryRoot, 'catalog', 'checklists', 'db05_check.json'),
    ]
    for (const file of files) {
      assert.ok(fs.existsSync(file), `${file} must exist`)
      assert.doesNotMatch(readUtf8(file), /同時|並列/, `${file} must describe sequential handling`)
    }
    const basicDesign = readUtf8(path.join(studyDbRoot, 'doc', 'basic_design', 'db05_basic_design.md'))
    const applicationReadme = readUtf8(path.join(applicationRoot, 'README.md'))
    const learningReadme = readUtf8(path.join(learningRoot, 'README.md'))
    assert.match(basicDesign, /005_create_indexes\.sql/)
    assert.match(basicDesign, /007_ineffective_index_examples\.sql/)
    assert.match(applicationReadme, /studyhub-db05/)
    assert.match(applicationReadme, /down --volumes --remove-orphans/)
    assert.match(learningReadme, /StudyWebとの関係/)
    psqlFile('db05_index_explain_performance', 'sql/001_schema.sql')
    psqlFile('db05_index_explain_performance', 'sql/002_seed_small.sql')
    psqlFile('db05_index_explain_performance', 'sql/003_seed_large.sql')
    psqlFile('db05_index_explain_performance', 'sql/004_explain_without_index.sql')
    psqlFile('db05_index_explain_performance', 'sql/005_create_indexes.sql')
    psqlFile('db05_index_explain_performance', 'sql/006_explain_with_index.sql')
    psqlFile('db05_index_explain_performance', 'sql/007_ineffective_index_examples.sql')
    assert.equal(scalar('SELECT count(*) FROM db05.orders;'), '20004')
    assert.equal(scalar("SELECT count(*) FROM pg_indexes WHERE schemaname = 'db05' AND indexname LIKE 'idx_%';"), '4')
    validatedTopics.push('db05')
  }

  if (shouldValidate('db06')) {
    section('db06 backup, isolated restore, and migrations')
    const applicationRoot = path.join(studyDbRoot, 'src', 'apps', 'db06_backup_restore_migration')
    const learningRoot = path.join(studyDbRoot, 'doc', 'learning_notes', 'db06_backup_restore_migration')
    const files = [
      path.join(studyDbRoot, 'doc', 'requirements', 'db06_backup_restore_migration_requirements.md'),
      path.join(studyDbRoot, 'doc', 'basic_design', 'db06_basic_design.md'),
      path.join(studyDbRoot, 'doc', 'detailed_design', 'db06_detailed_design.md'),
      path.join(applicationRoot, 'README.md'),
      path.join(applicationRoot, 'sql', '001_schema.sql'),
      path.join(applicationRoot, 'sql', '002_seed.sql'),
      path.join(applicationRoot, 'sql', 'migrations', '001_add_customer_email.sql'),
      path.join(applicationRoot, 'sql', 'migrations', '002_add_order_status.sql'),
      path.join(applicationRoot, 'sql', 'checks', '001_before_migration_check.sql'),
      path.join(applicationRoot, 'sql', 'checks', '002_after_migration_check.sql'),
      path.join(applicationRoot, 'sql', 'checks', '003_after_restore_check.sql'),
      path.join(learningRoot, 'README.md'),
      path.join(learningRoot, 'docs', 'backup_restore_log.md'),
      path.join(learningRoot, 'docs', 'migration_checklist.md'),
      path.join(learningRoot, 'docs', 'rollback_plan.md'),
      path.join(learningRoot, 'docs', 'studyaws_relation.md'),
      path.join(repositoryRoot, 'catalog', 'checklists', 'db06_check.json'),
    ]
    for (const file of files) {
      assert.ok(fs.existsSync(file), `${file} must exist`)
      assert.doesNotMatch(readUtf8(file), /同時|並列/, `${file} must describe sequential handling`)
    }
    const basicDesign = readUtf8(path.join(studyDbRoot, 'doc', 'basic_design', 'db06_basic_design.md'))
    const applicationReadme = readUtf8(path.join(applicationRoot, 'README.md'))
    const learningReadme = readUtf8(path.join(learningRoot, 'README.md'))
    assert.match(basicDesign, /002_after_migration_check\.sql/)
    assert.match(basicDesign, /003_after_restore_check\.sql/)
    assert.match(applicationReadme, /studyhub-db06/)
    assert.match(applicationReadme, /down --volumes --remove-orphans/)
    assert.match(learningReadme, /StudyAWSとの関係/)
    psqlFile('db06_backup_restore_migration', 'sql/001_schema.sql')
    psqlFile('db06_backup_restore_migration', 'sql/002_seed.sql')
    psqlFile('db06_backup_restore_migration', 'sql/checks/001_before_migration_check.sql')
    compose(
      'exec', '-T', 'db',
      'pg_dump', '-U', 'postgres', '-d', 'studydb', '--schema=db06', '--file=/tmp/studydb_db06.sql',
    )
    query('DROP DATABASE IF EXISTS studydb_restore;', 'postgres')
    query('CREATE DATABASE studydb_restore;', 'postgres')
    compose(
      'exec', '-T', 'db',
      'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'studydb_restore',
      '-f', '/tmp/studydb_db06.sql',
    )
    psqlFile('db06_backup_restore_migration', 'sql/checks/003_after_restore_check.sql', 'studydb_restore')
    assert.equal(scalar('SELECT count(*) FROM db06.customers;', 'studydb_restore'), '3')
    psqlFile('db06_backup_restore_migration', 'sql/migrations/001_add_customer_email.sql')
    psqlFile('db06_backup_restore_migration', 'sql/migrations/002_add_order_status.sql')
    psqlFile('db06_backup_restore_migration', 'sql/checks/002_after_migration_check.sql')
    assert.equal(scalar("SELECT count(*) FROM db06.customers WHERE email IS NULL;"), '0')
    assert.equal(scalar("SELECT count(*) FROM db06.orders WHERE status = 'created';"), '3')
    validatedTopics.push('db06')
  }

  console.log(`\nStudyDB validation passed: ${validatedTopics.join(', ')}`)
} finally {
  if (shouldUseDocker) {
    runDocker([...composePrefix, 'down', '--volumes', '--remove-orphans'], { allowFailure: true })
  }
}
