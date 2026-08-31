const diagnostics = {
  mode: process.env.APP_MODE ?? 'missing',
  port: process.env.PORT ?? '8080',
  working_directory: process.cwd()
}

console.log(JSON.stringify(diagnostics))

if (diagnostics.mode !== 'ok' || diagnostics.port !== '8080') {
  process.exitCode = 1
}
