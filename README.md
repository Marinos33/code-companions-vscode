# Code Companions for VS Code

A pixel companion in VS Code's Explorer that reacts to what **Claude Code** is doing: in the
Claude Code extension's chat, and in `claude` running in VS Code's terminal. Ships with
**Aemeath Mini** and **Sonic**; any [Codex pet](#characters) can be your companion.

| Claude is… | Your companion… |
| --- | --- |
| thinking | tilts her head ("?") |
| editing files | concentrates (>< face) |
| reading files or the web | peeks |
| searching | runs around looking |
| running shell commands | puts her sunglasses on |
| starting subagents | jumps |
| waiting for you (a permission or a question) | waits, looking at you |
| hitting an error | stumbles ("?") |
| finished | jumps for joy |
| idle | wanders around the panel |

She shows what Claude is doing in a speech bubble, and waves when you click her.

Want her in the terminal too? See
[code-companions-terminal](https://github.com/Marinos33/code-companions-terminal).

## Install

1. Get the extension:
   - download `code-companions-0.1.0.vsix` from the
     [Releases page](https://github.com/Marinos33/code-companions-vscode/releases), or
   - build it from a clone:
     ```bash
     npx @vscode/vsce package
     ```
2. Install it, then reload VS Code:
   ```bash
   code --install-extension code-companions-0.1.0.vsix
   ```
3. Open the Explorer: **Code Companions** is a section at the bottom. You can drag it to the
   panel or another sidebar.
4. Click **Companion** in the status bar (or run **Code Companions: Connect to Claude Code**),
   then press **Connect** in the dialog. The status bar turns into ♥.
   - It adds hooks to `~/.claude/settings.json` that run a small relay with `node`, so Node.js
     must be on your PATH. The dialog shows exactly what is added; your other settings and hooks
     are kept, and the file as it was is saved once as `settings.json.code-companions.bak`.
5. Start a new Claude chat and ask anything.

Each VS Code window reacts only to Claude Code sessions in its own workspace folders (a Claude
Code in WSL under `/mnt/<drive>/...` counts too).

**Upgrading from "Aemeath Pets"** (this extension's earlier name): connecting replaces its hooks.
Then uninstall the old extension:
```bash
code --uninstall-extension aemeath-local.aemeath-pets
```

## Characters

A character is a **Codex pet** folder: a `pet.json` and an 8×9 spritesheet.
```json
{ "id": "my-pet", "displayName": "My Pet", "description": "…", "spritesheetPath": "spritesheet.webp" }
```
- Rows, in order: idle, run right, run left, waving, jumping, failed, waiting, running, review.
- Frames per row: 6, 8, 8, 4, 5, 8, 6, 6, 6.
- Optional, beyond the Codex format: `extraRows` (`{ "asking": 4 }`) adds rows below the nine
  for one reaction (or replaces one of the nine), `loopFrom` (`{ "jumping": 2 }`) plays a row's
  first frames once then loops the rest, `frameMs` (`{ "idle": 200 }`, or one per frame) sets
  how long frames stay up, and `lines` (`{ "done": ["Too easy!"] }`) gives her own words.
  `characters/sonic/pet.json` uses all four.

- **Code Companions: Add a Folder of Characters…** adds a folder of characters, each in its own
  sub-folder (setting `codeCompanions.characterFolders`).
- **Code Companions: Pick a Character** switches between them (setting `codeCompanions.character`).
- **Code Companions: Play Every Reaction** shows every reaction, to check a character without
  running Claude Code.

Built in: **Aemeath Mini** (`characters/aemeath-mini`) and **Sonic** (`characters/sonic`). To
ship another, add its folder to `characters/`.

## Settings

| Setting | Default | |
| --- | --- | --- |
| `codeCompanions.character` | `aemeath-mini` | the character's id |
| `codeCompanions.characterFolders` | `[]` | folders with more characters |
| `codeCompanions.size` | `120` | her largest height in pixels; she shrinks to fit a smaller view |
| `codeCompanions.speechBubble` | `true` | say what Claude is doing |
| `codeCompanions.wander` | `true` | walk around while idle |
| `codeCompanions.background` | `none` | her scene: `night`, `desk`, `sakura`, `city` or `reactive` (the sky follows Claude) |

## Uninstall

Run **Code Companions: Disconnect from Claude Code** (it removes only its own hooks), then
uninstall the extension.

## Privacy

The relay records only the hook event name, session id, folder and tool name, in
`~/.code-companions/events.jsonl` on your computer. Never prompts, tool input or tool output.
Nothing leaves your machine.

## Development

Plain JavaScript, no dependencies, no build step.

```
extension.js        the view, event wiring, commands
src/behaviors.js    Claude Code hook event → animation row + speech line
src/events.js       follows ~/.code-companions/events.jsonl, filters by workspace folder
src/hooks.js        adds / removes the hook entries in ~/.claude/settings.json
src/characters.js   finds Codex pet folders
relay/relay.js      what the hooks run: appends one line per event
media/pet.js        the companion's page: canvas sprite, wandering, speech bubble
characters/         built-in characters
```

- Tests (`node --test`):
  ```bash
  npm test
  ```
- Preview the page in a browser with a button per reaction: run `node test/serve.js`, then open
  http://localhost:8765/test/preview.html.
- To test without Claude Code, append a JSON line to `~/.code-companions/events.jsonl`, e.g.
  `{"hook_event_name":"PreToolUse","tool_name":"Bash","cwd":"<your workspace folder>"}`.

## License

The code is [MIT](LICENSE). The character art is **not** covered: Aemeath belongs to Kuro Games,
Sonic to SEGA, and the pixel art to its authors; see [NOTICE.md](NOTICE.md). This is an
unofficial fan project, not affiliated with Kuro Games, SEGA or Anthropic.
