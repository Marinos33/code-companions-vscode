// Serves vscode-extension/ on http://localhost:8765 for test/preview.html.
const http = require('http')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.json': 'application/json' }

http
  .createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(8765, '127.0.0.1', () => console.log('http://localhost:8765/test/preview.html'))
