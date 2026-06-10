const fs = require('fs')
const path = require('path')

const [, , rawId, rawName] = process.argv
const id = (rawId || '').trim().toLowerCase()
const name = (rawName || rawId || '').trim()

if (!/^[a-z0-9-]+$/.test(id) || !name) {
  console.error('Usage: npm run create:pet -- <pet-id> "<display name>"')
  process.exit(1)
}

const petDir = path.resolve(__dirname, '..', 'pets', id)
if (fs.existsSync(petDir)) {
  console.error(`Pet already exists: pets/${id}`)
  process.exit(1)
}

fs.mkdirSync(path.join(petDir, 'sprites'), { recursive: true })
fs.writeFileSync(path.join(petDir, 'pet.json'), JSON.stringify({
  id,
  name,
  promptFile: 'prompt.txt',
  spritesFile: 'sprites.json',
  spritesManifestFile: 'sprites-manifest.json',
  cryUrl: '',
  greeting: `${name}! 반가워!`,
  thinkingText: `${name}가 생각하는 중`,
  fallbackText: '...?',
  errorText: 'AI 모델에 연결할 수 없어.',
  appearance: {
    width: 120,
    height: 140,
    imageWidth: 96,
    imageHeight: 96,
  },
  movement: {
    speed: 1,
    jumpHeight: 14,
    jumpDuration: 18,
    walkFrameInterval: 6,
    idleFrameInterval: 6,
    idleTalkMinMs: 180000,
    idleTalkMaxMs: 600000,
  },
  idlePhrases: [`${name}!`],
}, null, 2) + '\n')

fs.writeFileSync(path.join(petDir, 'prompt.txt'), `너는 ${name}야.\n친근하고 짧게 한국어로 대답해.\n`)
fs.writeFileSync(path.join(petDir, 'sprites.json'), JSON.stringify({
  down: [],
  side: [],
  back_side: [],
  back_up: [],
}, null, 2) + '\n')
fs.writeFileSync(path.join(petDir, 'sprites-manifest.json'), JSON.stringify({
  source_sheet: {
    filename: '',
    notes: 'Sprite generation metadata. This file is not read at runtime.',
  },
}, null, 2) + '\n')

console.log(`Created pets/${id}`)
console.log('Add PNG frames under its sprites directory, then edit sprites.json.')
