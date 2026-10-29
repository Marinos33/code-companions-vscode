# Code Companions for VS Code: guide for Claude

A VS Code extension showing a pixel companion (a Codex pet; Aemeath Mini by default) in the
Explorer, reacting to Claude Code through Claude Code hooks. Plain JavaScript, no dependencies,
no build step. `README.md` covers what the person sees; this file covers how it works and how to
change it safely. Its sibling, `code-companions-terminal`, puts the same companion in the
terminal.

## How it works

- **Bridge:** Claude Code hooks. "Code Companions: Connect to Claude Code" adds one entry per event
  (`src/hooks.js` `EVENTS`) to `~/.claude/settings.json`:
  - each entry runs `node "~/.code-companions/relay.js" code-companions`, the word
    `code-companions` marking the entries as ours
  - it asks in a modal first, and keeps a one-time `settings.json.code-companions.bak`

  `relay/relay.js` appends `{ts, hook_event_name, session_id, cwd, tool_name,
  notification_type, agent_id}` to `~/.code-companions/events.jsonl`. It never writes tool input
  or output, prints nothing, always exits 0, and rotates the file past 512 KB. Each VS Code window
  follows the file (`src/events.js`) and reacts to sessions whose `cwd` is in its workspace
  folders (WSL `/mnt/x/...` paths match `x:/...`).
- **Earlier name:** this was "Aemeath Pets" (marker `aemeath-pets`, folder `~/.aemeath-pets/`).
  `LEGACY_MARKERS` makes connecting replace those entries and disconnecting remove them;
  `isConnected` counts only current entries, since the old relay feeds a folder no longer
  followed.
- **Reactions:** `src/behaviors.js` maps events to a row and a line. `sticky` reactions last
  until the next event, with a 2-minute safety; the others last `ms`, then she wanders again.
  A session ending (`idle`) never cuts a short reaction: `claude -p` sends SessionEnd 0.4 s after
  Stop, and the end-of-turn jump still plays (`isSticky` in `media/pet.js`).
- **Characters:** Codex pet folders, built in under `characters/` or added with the setting
  `codeCompanions.characterFolders`. Frame counts are the Codex atlas' `[6,8,8,4,5,8,6,6,6]`.
  Adding one needs no code.

## Rules

- **Connecting is the person's click.** An auto-mode safety check refuses Claude writing
  Claude's own settings, so don't write the hooks yourself: point them to the status bar item
  or the command, and its **Connect** button. The status bar shows ♥ once connected.
- Hooks are read when a session starts; Claude Code 2.1.312 also picked them up in running
  sessions, so Claude's own tool calls in the workspace make the companion react.

## Testing

- **Unit tests:**
  ```bash
  npm test
  ```
  11 tests, including the relay against a throwaway home and the legacy-hook migration.
- **Page preview:** run `node test/serve.js`, then open `/test/preview.html`; it has a button
  per reaction, and `window.petTest` drives it.
- **Watcher without hooks:** append a JSON line to `~/.code-companions/events.jsonl` with
  Node; shell quoting eats Windows backslashes, so use forward slashes in `cwd`.
- **Live:**
  ```bash
  echo "<prompt>" | claude -p --model haiku --allowedTools "Read,Grep,Bash(sleep *)"
  ```
  Run it in a workspace folder in the background, while taking screenshots in one batch (each
  screenshot is itself a tool call she reacts to). `--allowedTools` takes a comma list: separate
  values swallow a prompt given as an argument.
- **Package:**
  ```bash
  npx @vscode/vsce package
  ```
  Then `code --install-extension code-companions-<version>.vsix`. The `.vsix` is git-ignored: it
  goes to GitHub Releases.
