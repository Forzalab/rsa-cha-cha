// Discord-style join slugs, run through a loudspeaker.
// No real party, state, leader, or event appears here — the target is always
// plaintext, semicolons, or the .vscode directory.

import { isRosas } from './rosasMode.js'

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
  '★ LEADER HAS JOINED — ALL RISE ★',
  '★ SURPRISE INSPECTION — PRAISE HIS GLORY ★',
]

const ROSAS = [
  '⚠ plaintext sympathiser {name} has entered — brace the semicolons',
  '⚠ VSCODE DESTROYER {name} sighted. Remain vigilant',
]

export function isKerney(name) {
  return (name ?? '').trim().toLocaleLowerCase('en-US') === 'kerney'
}

let lastGeneric = -1

export function joinSlug(name) {
  if (isKerney(name)) {
    return { kind: 'kerney', text: KERNEY[Math.floor(Math.random() * KERNEY.length)] }
  }
  if (isRosas(name)) {
    const line = ROSAS[Math.floor(Math.random() * ROSAS.length)]
    return { kind: 'rosas', text: line.replace('{name}', name) }
  }
  let pick = Math.floor(Math.random() * GENERIC.length)
  if (pick === lastGeneric) pick = (pick + 1) % GENERIC.length
  lastGeneric = pick
  return { kind: 'generic', text: GENERIC[pick].replace('{name}', name) }
}
