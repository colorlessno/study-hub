const response = await fetch('http://127.0.0.1:18088/health', {
  headers: {
    'X-Request-Id': 'studyhub-investigation-ok-01'
  }
})

const result = {
  status: response.status,
  request_id: response.headers.get('x-request-id'),
  body: await response.json()
}

console.log(JSON.stringify(result))

if (result.status !== 200 || result.body.status !== 'ok' || !result.request_id) {
  process.exitCode = 1
}
