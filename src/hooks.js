// Connects Claude Code to the pet: hook entries in ~/.claude/settings.json that run the relay,
// which appends each event to ~/.code-companions/events.jsonl. Every entry this adds carries
// MARKER in its command, so disconnecting removes exactly those and nothing else.
const fs = require('fs')
const os = require('os')
const path = require('path')

const MARKER = 'code-companions'
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json')
const RELAY = path.join(os.homedir(), '.code-companions', 'relay.js')

// The events the pet reacts to; the tool events take a matcher, the others none.
const TOOL_EVENTS = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest', 'PermissionDenied']
const EVENTS = ['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'Notification', 'Stop', 'StopFailure', 'SubagentStart', 'SubagentStop', 'PreCompact', ...TOOL_EVENTS]

function relayCommand(relayPath = RELAY) {
  return `node "${relayPath.replace(/\\/g, '/')}" ${MARKER}`
}

// Entries of the extension's earlier name ("Aemeath Pets") count as ours too, so connecting
// replaces them and disconnecting removes them.
const LEGACY_MARKERS = ['aemeath-pets']
const isOurs = hook => typeof hook.command === 'string' && [MARKER, ...LEGACY_MARKERS].some(m => hook.command.includes(m))

// Settings without this extension's hook entries; groups left empty are dropped, and so is an
// event (and `hooks` itself) left with none.
function withoutPetHooks(settings) {
  const out = { ...settings }
  if (!out.hooks) return out
  const hooks = {}
  for (const [event, groups] of Object.entries(out.hooks)) {
    const kept = (Array.isArray(groups) ? groups : [])
      .map(g => ({ ...g, hooks: (g.hooks || []).filter(h => !isOurs(h)) }))
      .filter(g => g.hooks.length > 0)
    if (kept.length) hooks[event] = kept
  }
  if (Object.keys(hooks).length) out.hooks = hooks
  else delete out.hooks
  return out
}

// Settings with one relay entry on every pet event, beside whatever hooks were already there.
function withPetHooks(settings, relayPath = RELAY) {
  const out = withoutPetHooks(settings)
  const hooks = { ...(out.hooks || {}) }
  const hook = { type: 'command', command: relayCommand(relayPath), timeout: 5 }
  for (const event of EVENTS) {
    const group = TOOL_EVENTS.includes(event) ? { matcher: '*', hooks: [hook] } : { hooks: [hook] }
    hooks[event] = [...(hooks[event] || []), group]
  }
  return { ...out, hooks }
}

// Connected means the current relay is hooked: entries of the earlier name alone feed a folder
// this extension does not follow.
function isConnected(settings) {
  return Object.values((settings && settings.hooks) || {}).some(groups =>
    (Array.isArray(groups) ? groups : []).some(g => (g.hooks || []).some(h => typeof h.command === 'string' && h.command.includes(MARKER))),
  )
}

function readSettings(file = SETTINGS) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

// Writes settings, keeping a one-time backup of the file as it was before the first change.
function writeSettings(settings, file = SETTINGS) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const backup = `${file}.code-companions.bak`
  if (fs.existsSync(file) && !fs.existsSync(backup)) fs.copyFileSync(file, backup)
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n')
}

// Copies the relay to a fixed place, so the hooks keep working when the extension updates.
function installRelay(source, target = RELAY) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
}

module.exports = { MARKER, SETTINGS, RELAY, EVENTS, relayCommand, withPetHooks, withoutPetHooks, isConnected, readSettings, writeSettings, installRelay }
