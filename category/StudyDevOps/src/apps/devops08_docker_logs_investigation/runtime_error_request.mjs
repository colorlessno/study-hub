const response = await fetch('http://127.0.0.1:18089/work', {
  headers: {
    'X-Request-Id': 'studyhub-investigation-01'
  }
})

const result = {
  status: response.status,
  request_id: response.headers.get('x-request-id'),
  body: await response.json()
}

console.log(JSON.stringify(result))

if (result.status !== 500 || result.body.error_code !== 'runtime_error' || !result.request_id) {
  process.exitCode = 1
}
