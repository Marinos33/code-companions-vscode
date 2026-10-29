// Follows the events file the relay appends to (one JSON hook event per line) and hands each new
// event whose session runs in one of this window's folders to `onEvent`. Starts at the end of the
// file, so a window only reacts to what happens after it opened. When the relay rotates the file
// (it shrinks), reading starts over from its beginning.
const fs = require('fs')
const os = require('os')
const path = require('path')

const DIR = path.join(os.homedir(), '.code-companions')
const FILE = path.join(DIR, 'events.jsonl')

// A path in one comparable form: forward slashes, no trailing slash, lower case on Windows, and a
// WSL `/mnt/e/...` path read as `e:/...` so a Claude Code in WSL matches the Windows folder.
function normalizePath(p) {
  let out = String(p || '').replace(/\\/g, '/').replace(/\/+$/, '')
  const wsl = /^\/mnt\/([a-zA-Z])(\/|$)/.exec(out)
  if (wsl) out = `${wsl[1]}:/${out.slice(wsl[0].length)}`.replace(/\/$/, '')
  return process.platform === 'win32' || wsl || /^[a-zA-Z]:/.test(out) ? out.toLowerCase() : out
}

// Whether `cwd` is one of `folders` or inside one.
function isInFolders(cwd, folders) {
  const c = normalizePath(cwd)
  return folders.some(f => {
    const n = normalizePath(f)
    return c === n || c.startsWith(n + '/')
  })
}

// Splits text into complete JSON lines; the last, unfinished line is returned as `rest`.
function parseLines(text) {
  const parts = text.split('\n')
  const rest = parts.pop()
  const events = []
  for (const line of parts) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line))
    } catch {
      // A torn or foreign line is skipped, never fatal.
    }
  }
  return { events, rest }
}

function watchEvents({ file = FILE, folders, onEvent, pollMs = 250 }) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  let offset = fs.existsSync(file) ? fs.statSync(file).size : 0
  let rest = ''
  let isReading = false

  const read = () => {
    if (isReading) return
    isReading = true
    try {
      if (!fs.existsSync(file)) return
      const size = fs.statSync(file).size
      if (size < offset) {
        offset = 0
        rest = ''
      }
      if (size === offset) return
      const fd = fs.openSync(file, 'r')
      const buf = Buffer.alloc(size - offset)
      fs.readSync(fd, buf, 0, buf.length, offset)
      fs.closeSync(fd)
      offset = size
      const parsed = parseLines(rest + buf.toString('utf8'))
      rest = parsed.rest
      for (const event of parsed.events) {
        if (isInFolders(event.cwd, folders())) onEvent(event)
      }
    } catch {
      // The file is being rotated or written: the next tick reads it.
    } finally {
      isReading = false
    }
  }

  // fs.watch is fast but not reliable on every file system (WSL mounts); polling backs it up.
  let watcher
  try {
    watcher = fs.watch(path.dirname(file), () => read())
  } catch {}
  const timer = setInterval(read, pollMs)
  return { dispose: () => { clearInterval(timer); watcher && watcher.close() }, read }
}

module.exports = { DIR, FILE, normalizePath, isInFolders, parseLines, watchEvents }
