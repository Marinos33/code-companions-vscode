// Unit tests of everything that runs without VS Code: node --test test/
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const { reactionFor, toolBehavior, ROWS, ANIM } = require('../src/behaviors')
const { normalizePath, isInFolders, parseLines, watchEvents } = require('../src/events')
const hooks = require('../src/hooks')
const { findCharacters } = require('../src/characters')

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'code-companions-'))

test('every behaviour plays a row the Codex atlas has', () => {
  for (const anim of Object.values(ANIM)) assert.ok(ROWS.includes(anim), anim)
})

test('tools map to their behaviour', () => {
  assert.equal(toolBehavior('Edit'), 'editing')
  assert.equal(toolBehavior('Read'), 'reading')
  assert.equal(toolBehavior('Grep'), 'searching')
  assert.equal(toolBehavior('Bash'), 'shell')
  assert.equal(toolBehavior('PowerShell'), 'shell')
  assert.equal(toolBehavior('Agent'), 'delegating')
  assert.equal(toolBehavior('AskUserQuestion'), 'asking')
  assert.equal(toolBehavior('mcp__github__create_issue'), 'tooling')
})

test('events become reactions; unknown events are ignored', () => {
  assert.equal(reactionFor({ hook_event_name: 'UserPromptSubmit' }).anim, 'failed')
  assert.equal(reactionFor({ hook_event_name: 'PreToolUse', tool_name: 'Edit' }).anim, 'review')
  assert.equal(reactionFor({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }).anim, 'running')
  const done = reactionFor({ hook_event_name: 'Stop' })
  assert.equal(done.anim, 'jumping')
  assert.equal(done.sticky, false)
  assert.equal(reactionFor({ hook_event_name: 'Notification' }).behavior, 'asking')
  assert.equal(reactionFor({ hook_event_name: 'PostToolUseFailure', tool_name: 'Bash' }).behavior, 'oops')
  assert.equal(reactionFor({ hook_event_name: 'CwdChanged' }), null)
  assert.equal(reactionFor({}), null)
})

test('paths compare across slashes, case and WSL mounts', () => {
  assert.equal(normalizePath('E:\\Coding\\Proj\\'), 'e:/coding/proj')
  assert.equal(normalizePath('/mnt/e/Coding/Proj'), 'e:/coding/proj')
  assert.ok(isInFolders('E:\\Coding\\Proj\\src', ['e:/coding/proj']))
  assert.ok(isInFolders('/mnt/e/Coding/Proj', ['E:\\Coding\\Proj']))
  assert.ok(!isInFolders('E:\\Coding\\Project2', ['E:\\Coding\\Proj']))
  assert.ok(!isInFolders(undefined, ['E:\\Coding\\Proj']))
})

test('lines parse; a torn last line waits, a bad line is skipped', () => {
  const { events, rest } = parseLines('{"a":1}\nnot json\n{"b":2}\n{"c":')
  assert.deepEqual(events, [{ a: 1 }, { b: 2 }])
  assert.equal(rest, '{"c":')
})

test('the watcher reads new events of this window only, and survives a rotation', () => {
  const dir = tmp()
  const file = path.join(dir, 'events.jsonl')
  fs.writeFileSync(file, JSON.stringify({ hook_event_name: 'Stop', cwd: dir }) + '\n')
  const seen = []
  const w = watchEvents({ file, folders: () => [dir], onEvent: e => seen.push(e.hook_event_name), pollMs: 10000 })
  fs.appendFileSync(file, JSON.stringify({ hook_event_name: 'UserPromptSubmit', cwd: path.join(dir, 'sub') }) + '\n')
  fs.appendFileSync(file, JSON.stringify({ hook_event_name: 'PreToolUse', cwd: os.homedir() + '/elsewhere' }) + '\n')
  w.read()
  fs.writeFileSync(file, JSON.stringify({ hook_event_name: 'SessionStart', cwd: dir }) + '\n')
  w.read()
  w.dispose()
  assert.deepEqual(seen, ['UserPromptSubmit', 'SessionStart'])
})

test('connecting adds one relay entry per event and keeps the person\'s own hooks', () => {
  const mine = { hooks: [{ type: 'command', command: 'echo mine' }] }
  const settings = { theme: 'dark', hooks: { Stop: [mine] } }
  const connected = hooks.withPetHooks(settings, '/home/x/.code-companions/relay.js')
  assert.equal(connected.theme, 'dark')
  assert.deepEqual(connected.hooks.Stop[0], mine)
  for (const event of hooks.EVENTS) {
    const ours = connected.hooks[event].flatMap(g => g.hooks).filter(h => h.command.includes(hooks.MARKER))
    assert.equal(ours.length, 1, event)
  }
  assert.equal(connected.hooks.PreToolUse.at(-1).matcher, '*')
  assert.equal(connected.hooks.Stop.at(-1).matcher, undefined)
  assert.ok(hooks.isConnected(connected))
  // Connecting again does not duplicate; disconnecting restores the original.
  assert.deepEqual(hooks.withPetHooks(connected, '/home/x/.code-companions/relay.js'), connected)
  assert.deepEqual(hooks.withoutPetHooks(connected), settings)
  assert.deepEqual(hooks.withoutPetHooks({ theme: 'dark' }), { theme: 'dark' })
})

test('connecting replaces the entries of the earlier "Aemeath Pets" name', () => {
  const legacy = { hooks: [{ type: 'command', command: 'node "/home/x/.aemeath-pets/relay.js" aemeath-pets' }] }
  const mine = { hooks: [{ type: 'command', command: 'echo mine' }] }
  const settings = { hooks: { Stop: [mine, legacy], PreToolUse: [{ matcher: '*', ...legacy }] } }
  assert.equal(hooks.isConnected(settings), false)
  const connected = hooks.withPetHooks(settings, '/home/x/.code-companions/relay.js')
  assert.ok(hooks.isConnected(connected))
  assert.ok(!JSON.stringify(connected).includes('aemeath-pets'))
  assert.deepEqual(connected.hooks.Stop[0], mine)
  assert.deepEqual(hooks.withoutPetHooks(settings), { hooks: { Stop: [mine] } })
})

test('settings are written with a one-time backup', () => {
  const dir = tmp()
  const file = path.join(dir, 'settings.json')
  fs.writeFileSync(file, '{"theme":"dark"}')
  hooks.writeSettings({ theme: 'light' }, file)
  hooks.writeSettings({ theme: 'other' }, file)
  assert.equal(JSON.parse(fs.readFileSync(file + '.code-companions.bak', 'utf8')).theme, 'dark')
  assert.equal(hooks.readSettings(file).theme, 'other')
})

test('characters are found in the built-in folder and added folders, first id wins', () => {
  const extra = tmp()
  const pet = path.join(extra, 'other-pet')
  fs.mkdirSync(pet)
  fs.writeFileSync(path.join(pet, 'pet.json'), JSON.stringify({ id: 'other', displayName: 'Other', spritesheetPath: 'sheet.webp' }))
  fs.writeFileSync(path.join(pet, 'sheet.webp'), '')
  const dupe = path.join(extra, 'dupe')
  fs.mkdirSync(dupe)
  fs.writeFileSync(path.join(dupe, 'pet.json'), JSON.stringify({ id: 'aemeath-mini', spritesheetPath: 'sheet.webp' }))
  fs.writeFileSync(path.join(dupe, 'sheet.webp'), '')
  fs.mkdirSync(path.join(extra, 'no-sheet'))
  fs.writeFileSync(path.join(extra, 'no-sheet', 'pet.json'), '{"id":"broken"}')
  const all = findCharacters([path.join(__dirname, '..', 'characters'), extra, path.join(extra, 'missing')])
  assert.deepEqual(all.map(c => c.id), ['aemeath-mini', 'other'])
  assert.equal(all[0].displayName, 'Aemeath Mini')
})

test('the relay records the event without tool input, and rotates a big file', () => {
  const home = tmp()
  const env = { ...process.env, HOME: home, USERPROFILE: home }
  const relay = path.join(__dirname, '..', 'relay', 'relay.js')
  const input = JSON.stringify({ hook_event_name: 'PreToolUse', session_id: 's1', cwd: '/w', tool_name: 'Bash', tool_input: { command: 'echo SECRET' } })
  const run = spawnSync(process.execPath, [relay], { input, env, encoding: 'utf8' })
  assert.equal(run.status, 0)
  assert.equal(run.stdout, '')
  const file = path.join(home, '.code-companions', 'events.jsonl')
  const text = fs.readFileSync(file, 'utf8')
  assert.ok(!text.includes('SECRET'))
  const record = JSON.parse(text)
  assert.equal(record.tool_name, 'Bash')
  assert.equal(record.cwd, '/w')
  fs.writeFileSync(file, 'x'.repeat(600 * 1024))
  spawnSync(process.execPath, [relay], { input, env })
  assert.ok(fs.statSync(file).size < 1024)
  assert.ok(fs.existsSync(path.join(home, '.code-companions', 'events.old.jsonl')))
  // Bad input still exits 0 with no output.
  const bad = spawnSync(process.execPath, [relay], { input: 'not json', env, encoding: 'utf8' })
  assert.equal(bad.status, 0)
  assert.equal(bad.stdout, '')
})
