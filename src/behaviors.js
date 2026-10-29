// What the pet does for each Claude Code hook event: an animation row of the Codex pet atlas, a
// line for her speech bubble, and whether she keeps doing it until the next event (`sticky`) or
// for `ms` before going back to wandering. Shared by every character: all Codex pets have the
// same rows.

// The Codex pet atlas: 8 columns x 9 rows of frames, one row per animation, and its frame counts.
const ROWS = ['idle', 'runRight', 'runLeft', 'waving', 'jumping', 'failed', 'waiting', 'running', 'review']

const WORDS = {
  thinking: ['Tilting her head…', 'Pondering very hard…', 'Counting feathers…', 'Following a hunch…'],
  editing: ['Scribbling furiously…', 'Fixing it just right…', 'Squinting at the code…'],
  reading: ['Peeking at the file…', 'Reading closely…', 'Studying the lines…'],
  searching: ['Searching high and low…', 'Hunting for clues…', 'Flying through folders…'],
  shell: ['Vibing with the terminal…', 'Running commands in shades…', 'Humming a tune…'],
  delegating: ['Calling her friends…', 'Sending little helpers…'],
  asking: ['Waiting for you…', 'Curious about your answer…'],
  tooling: ['Tinkering away…', 'Poking at things…'],
  oops: ['Oops, that stumbled…', 'Hmm, not quite…'],
  done: ['All done!', 'Ta-da!', 'Finished!'],
  hello: ['Hi there!', 'Ready when you are!'],
  compacting: ['Tidying up her notes…'],
}

// The behaviour a tool shows while it runs, by the tool's name.
function toolBehavior(tool) {
  if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(tool)) return 'editing'
  if (/^(Read|WebFetch|NotebookRead)$/.test(tool)) return 'reading'
  if (/^(Grep|Glob|LS|WebSearch|ToolSearch)$/.test(tool)) return 'searching'
  if (/^(Bash|PowerShell|BashOutput|Monitor)$/.test(tool)) return 'shell'
  if (/^(Agent|Task|Workflow|SendMessage)$/.test(tool)) return 'delegating'
  if (/^(AskUserQuestion|ExitPlanMode)$/.test(tool)) return 'asking'
  return 'tooling'
}

const ANIM = {
  thinking: 'failed',
  editing: 'review',
  reading: 'waiting',
  searching: 'runLeft',
  shell: 'running',
  delegating: 'jumping',
  asking: 'waiting',
  tooling: 'runRight',
  oops: 'failed',
  done: 'jumping',
  hello: 'waving',
  compacting: 'review',
}

// The reaction to one hook event, or null for events the pet ignores. `at` picks the line, so a
// reaction is the same for the same event and time (and tests are stable).
function reactionFor(event, at = Date.now()) {
  const name = event && event.hook_event_name
  let behavior
  let sticky = true
  let ms = 0
  switch (name) {
    case 'SessionStart':
      behavior = 'hello'; sticky = false; ms = 2500
      break
    case 'UserPromptSubmit':
    case 'PostToolUse':
    case 'SubagentStop':
      behavior = 'thinking'
      break
    case 'PreToolUse':
      behavior = toolBehavior(String(event.tool_name || ''))
      break
    case 'PostToolUseFailure':
    case 'StopFailure':
    case 'PermissionDenied':
      behavior = 'oops'; sticky = name !== 'StopFailure'; ms = 2500
      break
    case 'SubagentStart':
      behavior = 'delegating'
      break
    case 'Notification':
    case 'PermissionRequest':
      behavior = 'asking'
      break
    case 'PreCompact':
      behavior = 'compacting'
      break
    case 'Stop':
      behavior = 'done'; sticky = false; ms = 2500
      break
    case 'SessionEnd':
      return { behavior: 'idle', anim: 'idle', line: '', sticky: false, ms: 0 }
    default:
      return null
  }
  const lines = WORDS[behavior]
  return { behavior, anim: ANIM[behavior], line: lines[Math.floor(at / 4000) % lines.length], sticky, ms }
}

module.exports = { ROWS, WORDS, ANIM, toolBehavior, reactionFor }
