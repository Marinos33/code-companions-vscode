# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Webview:** `extension.js` builds one Explorer webview (`codeCompanions.view`) from
  `media/pet.css`, `media/backgrounds.js` and `media/pet.js`, and posts it `setup` (settings,
  character, sheet URI) and `react` messages. `pet.js` draws her on a canvas and sizes her with
  `fitSize`: `codeCompanions.size` is a maximum, shrunk to fit the view (minus `BUBBLE_ROOM`).
- **Backgrounds:** `media/backgrounds.js` sets `window.petBackgrounds` (`night`, `desk`, `sakura`,
  `city`, `reactive`), each a pixel-art function `(ctx, w, h, t, behavior)` redrawn every frame
  on a low-resolution `#bg` canvas that `pet.js` stretches by whole-pixel `bgScale`, bottom-aligned
  (about 54 cells per pet height, `BG_CELLS_PER_PET`); `scene()` gives them shared units. `behavior` is the current reaction's
  `behavior` (or `idle`), so scenes can follow Claude. A new scene needs an entry there plus the
  `codeCompanions.background` enum in `package.json` (and `README.md`'s settings table).
- **Characters:** Codex pet folders, built in under `characters/` or added with the setting
  `codeCompanions.characterFolders`. Frame counts are the Codex atlas' `[6,8,8,4,5,8,6,6,6]`.
  Adding one needs no code. Four `pet.json` fields of ours: `extraRows` (`{ "asking": 4 }`) adds
  rows below the nine, each named after the behaviour it plays instead of the shared row (or
  after one of the nine, which it then replaces: a longer `idle`),
  `loopFrom` (`{ "jumping": 2 }`) plays a row's first frames once, then loops from that frame,
  `frameMs` (`{ "idle": 200 }`, or a list per frame) changes the 125 ms a frame stays up, and
  `lines` (`{ "done": ["Too easy!"] }`) replaces the shared speech-bubble lines of a behaviour.

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
- **Single test file / test:** `node --test test/unit.test.js`, add `--test-name-pattern "<name>"`
  for one test.
- **Page preview:** run `node test/serve.js`, then open `/test/preview.html`; it has a button
  per reaction, and `window.petTest` drives it. `?bg=night|desk|sakura|city|reactive` picks a
  scene, `?w=`/`?h=` the view size and `?react=<button>` a starting reaction. Its `reactions` table is a hand copy of
  `src/behaviors.js`: update both together.
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
