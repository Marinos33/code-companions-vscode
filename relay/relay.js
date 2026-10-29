#!/usr/bin/env node
// Claude Code hook relay for Code Companions: reads the hook event on stdin and appends a small
// record of it to ~/.code-companions/events.jsonl, which the VS Code extension follows. It keeps
// only what the pet needs (never tool input or output), prints nothing, never blocks Claude Code
// for long, and always exits 0 so a hook problem can't stop a turn.
const fs = require('fs')
const os = require('os')
const path = require('path')

const DIR = path.join(os.homedir(), '.code-companions')
const FILE = path.join(DIR, 'events.jsonl')
const MAX_BYTES = 512 * 1024

let raw = ''
const done = () => {
  try {
    const e = JSON.parse(raw || '{}')
    const record = {
      ts: Date.now(),
      hook_event_name: e.hook_event_name,
      session_id: e.session_id,
      cwd: e.cwd,
      tool_name: e.tool_name,
      notification_type: e.notification_type,
      agent_id: e.agent_id,
    }
    fs.mkdirSync(DIR, { recursive: true })
    // Past MAX_BYTES the file starts over; readers notice it shrank and read from the start.
    try {
      if (fs.statSync(FILE).size > MAX_BYTES) fs.renameSync(FILE, path.join(DIR, 'events.old.jsonl'))
    } catch {}
    fs.appendFileSync(FILE, JSON.stringify(record) + '\n')
  } catch {}
  process.exit(0)
}

process.stdin.setEncoding('utf8')
process.stdin.on('data', d => (raw += d))
process.stdin.on('end', done)
setTimeout(done, 2000).unref()
