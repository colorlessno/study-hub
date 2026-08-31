import http from 'node:http'

const html = `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>devops04</title></head>
<body>
  <main>
    <h1>Playwright E2E Sample</h1>
    <form id="form">
      <input data-testid="name-input" id="name" aria-label="name">
      <button data-testid="submit-button" type="submit">Submit</button>
    </form>
    <p data-testid="result-message" id="result"></p>
  </main>
  <script>
    document.getElementById('form').addEventListener('submit', (event) => {
      event.preventDefault()
      const value = document.getElementById('name').value.trim()
      document.getElementById('result').textContent = value ? 'Hello ' + value : 'Name is required'
    })
  </script>
</body>
</html>`

http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(html)
}).listen(5174, () => console.log('web listening on 5174'))
