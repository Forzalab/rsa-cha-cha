// Discord-style join slugs, run through a loudspeaker.
// No real party, state, leader, or event appears here — the target is always
// plaintext, semicolons, or the .vscode directory.



const GENERIC = [
  '{name} has passed political review and been admitted',
  'A wild {name} has appeared',
  '{name} joined the channel — public key on file',
  '{name} arrived carrying a prime',
  '{name} was entered into the register by order of the committee',
  '{name} deleted the .vscode directory and was commended',
  '{name} swore never to upload plaintext',
  '{name} joined — channel 6868 population +1',
  '{name} passed the Euclid inspection',
  '{name} brought their own semicolons',
  '{name} delivered the modular arithmetic quota',
  '{name} reported for duty',
]

const KERNEY = [
  '★ THE SUPREME LEADER HAS JOINED — ALL RISE ★',
  '★ KERNEY HAS ARRIVED — PRAISE HIS GLORY ★',
]

const ROSAS = [
  '⚠ .vscode spreader {name} invaded our space — brace your nvim configs',
  '⚠ NVIM DESTROYER {name} sighted. Remain vigilant for .vscode',
]

// Deliberately loose. A missed match costs the best moment of the demo; a
// false positive costs one silly banner. The asymmetry is not close.
const KERNEY_RE = /(k[e3]rn|kearn|curn|prof|instructor|teacher|lecturer|\bbill\b|\bwm\b|\bdr\b|sensei|senpai)/i
const ROSAS_RE = /(r[o0]s[ae]s?|r[o0]z[ae]s?|rsas|rosss|\brose\b)/i

export function isKerney(name) {
  return KERNEY_RE.test((name ?? '').trim())
}

export function isRosasName(name) {
  return ROSAS_RE.test((name ?? '').trim())
}

let lastGeneric = -1

export function joinSlug(name) {
  if (isKerney(name)) {
    return { kind: 'kerney', text: KERNEY[Math.floor(Math.random() * KERNEY.length)] }
  }
  if (isRosasName(name)) {
    const line = ROSAS[Math.floor(Math.random() * ROSAS.length)]
    return { kind: 'rosas', text: line.replace('{name}', name) }
  }
  let pick = Math.floor(Math.random() * GENERIC.length)
  if (pick === lastGeneric) pick = (pick + 1) % GENERIC.length
  lastGeneric = pick
  return { kind: 'generic', text: GENERIC[pick].replace('{name}', name) }
}
