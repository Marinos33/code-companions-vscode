// Code Companions: a pet in a VS Code view that reacts to Claude Code. Claude Code hooks run
// relay/relay.js, which appends each event to ~/.code-companions/events.jsonl; this follows that
// file and turns events from sessions in this window's folders into reactions for the view.
const vscode = require('vscode')
const crypto = require('crypto')
const path = require('path')
const { execFile } = require('child_process')

const { reactionFor } = require('./src/behaviors')
const { findCharacters } = require('./src/characters')
const { watchEvents } = require('./src/events')
const hooks = require('./src/hooks')

const config = () => vscode.workspace.getConfiguration('codeCompanions')

function activate(context) {
  const builtIn = path.join(context.extensionPath, 'characters')
  const characters = () => findCharacters([builtIn, ...config().get('characterFolders', [])])
  const currentCharacter = () => {
    const all = characters()
    return all.find(c => c.id === config().get('character')) || all[0]
  }

  let view
  let lastReaction = null

  const post = message => view && view.webview.postMessage(message)

  // Everything the page needs to draw the current character with the current settings.
  const sendSetup = () => {
    const character = currentCharacter()
    if (!view || !character) return
    post({
      type: 'setup',
      character: {
        id: character.id,
        name: character.displayName,
        sheet: view.webview.asWebviewUri(vscode.Uri.file(character.spritesheet)).toString(),
      },
      size: config().get('size', 120),
      speechBubble: config().get('speechBubble', true),
      wander: config().get('wander', true),
      background: config().get('background', 'none'),
    })
    if (lastReaction) post({ type: 'react', reaction: lastReaction })
  }

  // The page, allowed to load from the extension and every character's folder. The page asks
  // for its setup once loaded; a settings change renders it again (a new character may live in a
  // folder the old options did not allow).
  const render = () => {
    if (!view) return
    const webview = view.webview
    const media = vscode.Uri.joinPath(context.extensionUri, 'media')
    const nonce = crypto.randomBytes(16).toString('base64')
    const csp = webview.cspSource
    webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.file(context.extensionPath), ...characters().map(c => vscode.Uri.file(c.folder))] }
    webview.html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${csp} data:; style-src ${csp}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(media, 'pet.css'))}">
</head><body>
<div id="stage"><canvas id="bg" hidden></canvas><div id="bubble" hidden></div><canvas id="pet"></canvas></div>
<script nonce="${nonce}" src="${webview.asWebviewUri(vscode.Uri.joinPath(media, 'backgrounds.js'))}"></script>
<script nonce="${nonce}" src="${webview.asWebviewUri(vscode.Uri.joinPath(media, 'pet.js'))}"></script>
</body></html>`
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codeCompanions.view', {
      resolveWebviewView(webviewView) {
        view = webviewView
        webviewView.webview.onDidReceiveMessage(m => m && m.type === 'ready' && sendSetup())
        webviewView.onDidDispose(() => { view = undefined })
        render()
      },
    }),
  )

  // Claude Code events from sessions running in this window's folders.
  const watcher = watchEvents({
    folders: () => (vscode.workspace.workspaceFolders || []).map(f => f.uri.fsPath),
    onEvent: event => {
      const reaction = reactionFor(event)
      if (!reaction) return
      lastReaction = reaction.sticky ? reaction : null
      post({ type: 'react', reaction })
    },
  })
  context.subscriptions.push(watcher)

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => e.affectsConfiguration('codeCompanions') && render()),

    vscode.commands.registerCommand('codeCompanions.connect', () => reportingErrors(() => connect(context)).then(updateStatus)),
    vscode.commands.registerCommand('codeCompanions.disconnect', () => reportingErrors(disconnect).then(updateStatus)),

    vscode.commands.registerCommand('codeCompanions.pickCharacter', async () => {
      const picked = await vscode.window.showQuickPick(
        characters().map(c => ({ label: c.displayName, description: c.id, detail: c.description, id: c.id })),
        { placeHolder: 'Pick a character' },
      )
      if (picked) await config().update('character', picked.id, vscode.ConfigurationTarget.Global)
    }),

    vscode.commands.registerCommand('codeCompanions.addCharacterFolder', async () => {
      const [folder] = (await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Add characters from this folder' })) || []
      if (!folder) return
      const folders = config().get('characterFolders', [])
      await config().update('characterFolders', [...new Set([...folders, folder.fsPath])], vscode.ConfigurationTarget.Global)
      const found = findCharacters([folder.fsPath])
      vscode.window.showInformationMessage(found.length ? `Found ${found.map(c => c.displayName).join(', ')}.` : 'No Codex pet (pet.json + spritesheet) found in that folder.')
    }),

    // Plays one reaction per behaviour, to check a character without running Claude Code.
    vscode.commands.registerCommand('codeCompanions.testReactions', async () => {
      const tools = ['Read', 'Grep', 'Edit', 'Bash', 'Agent', 'AskUserQuestion', 'SomeMcpTool']
      const events = [
        { hook_event_name: 'SessionStart' },
        { hook_event_name: 'UserPromptSubmit' },
        ...tools.map(tool_name => ({ hook_event_name: 'PreToolUse', tool_name })),
        { hook_event_name: 'PostToolUseFailure', tool_name: 'Bash' },
        { hook_event_name: 'Notification', notification_type: 'permission_prompt' },
        { hook_event_name: 'Stop' },
      ]
      await vscode.commands.executeCommand('codeCompanions.view.focus')
      for (const event of events) {
        post({ type: 'react', reaction: reactionFor(event) })
        await new Promise(r => setTimeout(r, 2200))
      }
      lastReaction = null
    }),
  )

  // The status bar says whether Claude Code is connected; while it is not, a click connects.
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  const updateStatus = () => {
    let isConnected = false
    try {
      isConnected = hooks.isConnected(hooks.readSettings())
    } catch {}
    status.text = isConnected ? '$(heart) Companion' : '$(debug-disconnect) Companion'
    status.tooltip = isConnected ? 'Code Companions is connected to Claude Code' : 'Code Companions is not connected to Claude Code: click to connect'
    status.command = isConnected ? 'codeCompanions.view.focus' : 'codeCompanions.connect'
    status.show()
  }
  updateStatus()
  context.subscriptions.push(status)

  offerToConnect(context)
}

// Runs a command, showing any failure instead of letting it pass silently.
async function reportingErrors(run) {
  try {
    await run()
  } catch (err) {
    vscode.window.showErrorMessage(`Code Companions: ${err && err.message ? err.message : err}`)
  }
}

async function offerToConnect(context) {
  if (hooks.isConnected(hooks.readSettings()) || context.globalState.get('offeredConnect')) return
  await context.globalState.update('offeredConnect', true)
  const choice = await vscode.window.showInformationMessage('Code Companions can react to Claude Code once it is connected through Claude Code hooks.', 'Connect…', 'Not now')
  if (choice === 'Connect…') vscode.commands.executeCommand('codeCompanions.connect')
}

const nodeVersion = () => new Promise(resolve => execFile('node', ['--version'], { timeout: 5000 }, (err, out) => resolve(err ? null : out.trim())))

async function connect(context) {
  const node = await nodeVersion()
  if (!node) {
    vscode.window.showErrorMessage('Code Companions needs Node.js on PATH: Claude Code runs the pet relay with `node`. Install Node.js, then connect again.')
    return
  }
  const settings = hooks.readSettings()
  const command = hooks.relayCommand()
  const choice = await vscode.window.showWarningMessage(
    'Connect Code Companions to Claude Code?',
    {
      modal: true,
      detail: `This adds a hook to ${hooks.SETTINGS} on ${hooks.EVENTS.length} events (${hooks.EVENTS.join(', ')}). Each runs:\n\n${command}\n\nIt records only the event name, session, folder and tool name in ~/.code-companions/events.jsonl, never tool input or output. Your other settings and hooks are kept, and the file as it was is saved once as settings.json.code-companions.bak. "Disconnect from Claude Code" removes these hooks again.`,
    },
    'Connect',
  )
  if (choice !== 'Connect') return
  hooks.installRelay(path.join(context.extensionPath, 'relay', 'relay.js'))
  hooks.writeSettings(hooks.withPetHooks(settings))
  vscode.window.showInformationMessage('Code Companions is connected: new Claude Code sessions (and the next turn of running ones) will make her react.')
}

async function disconnect() {
  const settings = hooks.readSettings()
  if (!hooks.isConnected(settings)) {
    vscode.window.showInformationMessage('Code Companions is not connected to Claude Code.')
    return
  }
  hooks.writeSettings(hooks.withoutPetHooks(settings))
  vscode.window.showInformationMessage('Code Companions is disconnected from Claude Code: its hooks are removed, the rest of your settings kept.')
}

function deactivate() {}

module.exports = { activate, deactivate }
