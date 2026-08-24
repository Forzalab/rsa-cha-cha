// The bot is called kernai everywhere it actually lives — in the roster, in
// message payloads, in the wire. The mask is display-only, applied at the last
// possible moment, so nothing downstream has to know about the disguise.

const MASKS = { kernai: 'kerney' }

export const BOT_ID = 'kernai'

export function displayName(name) {
  if (!name) return name
  return MASKS[name.trim().toLocaleLowerCase('en-US')] ?? name
}
