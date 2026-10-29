// Characters are Codex pet folders: a `pet.json` ({ id, displayName, description, spritesheetPath })
// beside a spritesheet of 8 columns x 9 rows. The built-in ones live in `characters/`; the
// `codeCompanions.characterFolders` setting adds folders that hold more (each pet in its own
// sub-folder, or the folder itself being one).
const fs = require('fs')
const path = require('path')

function readPet(folder) {
  const file = path.join(folder, 'pet.json')
  if (!fs.existsSync(file)) return null
  try {
    const pet = JSON.parse(fs.readFileSync(file, 'utf8'))
    const sheet = path.join(folder, pet.spritesheetPath || 'spritesheet.webp')
    if (!fs.existsSync(sheet)) return null
    return {
      id: String(pet.id || path.basename(folder)),
      displayName: String(pet.displayName || pet.id || path.basename(folder)),
      description: String(pet.description || ''),
      folder,
      spritesheet: sheet,
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
