// Characters are Codex pet folders: a `pet.json` ({ id, displayName, description, spritesheetPath })
// beside a spritesheet of 8 columns x 9 rows. Four additions of ours: `extraRows` ({ asking: 6 })
// adds rows below those nine, each with its frame count and named after the behaviour it plays
// (or after one of the nine, `idle` say, which it then replaces); `loopFrom` ({ jumping: 2 })
// makes a row's first frames play once, then loop from that frame (a curl, then the ball
// spinning); `frameMs` ({ idle: 200 } or { idle: [600, 150, ...] }) sets how long a row's frames,
// or each of them, stay up instead of 125 ms; `lines` ({ done: ['Too easy!'] }) gives the speech
// bubble the character's own words for a behaviour. The built-in ones live in `characters/`; the
// `codeCompanions.characterFolders` setting adds folders that hold more (each pet in its own
// sub-folder, or the folder itself being one).
const fs = require('fs')
const path = require('path')
const { ROWS } = require('./behaviors')

const isObject = v => v && typeof v === 'object' && !Array.isArray(v)

// The extra rows with 1 to 8 frames, in the order the atlas has them.
function extraRowsOf(extraRows) {
  if (!isObject(extraRows)) return {}
  return Object.fromEntries(Object.entries(extraRows).filter(([, count]) => Number.isInteger(count) && count >= 1 && count <= 8))
}

// The rows of `loopFrom` this atlas has, each with a whole frame number.
function loopsOf(loopFrom, rows) {
  if (!isObject(loopFrom)) return {}
  return Object.fromEntries(Object.entries(loopFrom).filter(([row, frame]) => rows.includes(row) && Number.isInteger(frame) && frame >= 0))
}

// The rows of `frameMs` this atlas has, each with a duration or a list of them, in ms.
function durationsOf(frameMs, rows) {
  if (!isObject(frameMs)) return {}
  const isMs = v => typeof v === 'number' && v >= 40 && v <= 5000
  return Object.fromEntries(Object.entries(frameMs).filter(([row, ms]) => rows.includes(row) && (isMs(ms) || (Array.isArray(ms) && ms.length <= 8 && ms.every(isMs)))))
}

// The behaviours of `lines` with at least one line of text, empty ones left out.
function linesOf(lines) {
  if (!isObject(lines)) return {}
  return Object.fromEntries(
    Object.entries(lines)
      .map(([behavior, list]) => [behavior, Array.isArray(list) ? list.filter(l => typeof l === 'string' && l.trim()).map(String) : []])
      .filter(([, list]) => list.length),
  )
}

function readPet(folder) {
  const file = path.join(folder, 'pet.json')
  if (!fs.existsSync(file)) return null
  try {
    const pet = JSON.parse(fs.readFileSync(file, 'utf8'))
    const sheet = path.join(folder, pet.spritesheetPath || 'spritesheet.webp')
    if (!fs.existsSync(sheet)) return null
    const extraRows = extraRowsOf(pet.extraRows)
    const rows = [...ROWS, ...Object.keys(extraRows)]
    return {
      id: String(pet.id || path.basename(folder)),
      displayName: String(pet.displayName || pet.id || path.basename(folder)),
      description: String(pet.description || ''),
      folder,
      spritesheet: sheet,
      extraRows,
      loopFrom: loopsOf(pet.loopFrom, rows),
      frameMs: durationsOf(pet.frameMs, rows),
      lines: linesOf(pet.lines),
    }
  } catch {
    return null
  }
}

// Every character found, built-in ones first; a later one with an id already seen is skipped.
function findCharacters(roots) {
  const found = new Map()
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue
    const candidates = [root, ...fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(root, d.name))]
    for (const folder of candidates) {
      const pet = readPet(folder)
      if (pet && !found.has(pet.id)) found.set(pet.id, pet)
    }
  }
  return [...found.values()]
}

module.exports = { readPet, findCharacters }
