// Zalgo text and the ritual vocabulary.
//
// The three words on screen are drawn from three FIXED columns. A word never
// leaves its column, so the sentence can scramble without ever producing a
// line that reads as a real slogan about a real thing.

const ABOVE = [
  '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0306', '\u0307', '\u0308',
  '\u030A', '\u030B', '\u030C', '\u0311', '\u0313', '\u033D', '\u0346', '\u035B',
]
const BELOW = [
  '\u0316', '\u0317', '\u0318', '\u0319', '\u031C', '\u031E', '\u0320', '\u0324',
  '\u0325', '\u0326', '\u0329', '\u032D', '\u032E', '\u0331', '\u0333', '\u0347',
]
const MID = ['\u0334', '\u0335', '\u0336', '\u0338']

const pick = (list) => list[Math.floor(Math.random() * list.length)]

// intensity 0..1. At 0 the text comes back untouched, which is what the
// reduced-motion path and the first frame both want.
export function zalgo(text, intensity = 0.5) {
  if (intensity <= 0) return text
  const up = Math.round(intensity * 5)
  const down = Math.round(intensity * 4)
  let out = ''
  for (const character of text) {
    out += character
    if (character === ' ') continue
    for (let i = 0; i < up; i += 1) out += pick(ABOVE)
    for (let i = 0; i < down; i += 1) out += pick(BELOW)
    if (Math.random() < intensity * 0.4) out += pick(MID)
  }
  return out
}

// Column 1 · Column 2 · Column 3. Locked.
export const COLUMNS = [
  ['DRINK', 'RSA', 'PRAISE', 'OBEY'],
  ['YOUR', 'YOUR', 'SUPREME', 'THE'],
  ['OVALTINE', 'MESSAGE', 'LEADER', 'MODULUS'],
]

export function permuteColumns() {
  return COLUMNS.map((column) => column[Math.floor(Math.random() * column.length)])
}

const SEEK = [
  'comrade {name} seeks glory, glory shall deliver',
  'comrade {name} types beyond the quota — the committee has noticed',
  'comrade {name} approaches the threshold. Stand clear',
  '{name} is generating heat. Glory is aware',
  'the keyboard of comrade {name} has begun to sing',
]

const CLOSE = [
  'the room returns. {name} is commended',
  'transmission ends. {name} exceeded the quota and lived',
  '{name} has been logged by the committee. Carry on',
  'normal service resumes. Do not discuss what you saw',
  'the modulus releases you. {name} did that',
]

const line = (list, name) =>
  list[Math.floor(Math.random() * list.length)].replace('{name}', name)

export const seekSlug = (name) => line(SEEK, name)
export const closeSlug = (name) => line(CLOSE, name)

export const bowLine = (name) => `向 ${name} 俯首 · BOW TO ${name} · `
