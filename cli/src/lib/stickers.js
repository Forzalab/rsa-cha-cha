export const STICKERS = [
  { name: 'armed_and_bricked', label: 'Armed and Bricked', src: '/stickers/armed_and_bricked.jpg' },
  { name: 'calculating_vibes', label: 'Calculating Vibes', src: '/stickers/calculating_vibes.jpg' },
  { name: 'bearly_compiling', label: 'Bearly Compiling', src: '/stickers/bearly_compiling.jpg' },
  { name: 'sudo_submit', label: 'Sudo Submit', src: '/stickers/sudo_submit.jpg' },
  { name: 'stack_overjoyed', label: 'Stack Overjoyed', src: '/stickers/stack_overjoyed.jpg' },
]

export function stickerShortcode(name) {
  return `:${name}:`
}

export function findSticker(value) {
  const match = /:([a-z0-9_]+):/.exec(value)
  return match ? STICKERS.find((sticker) => sticker.name === match[1]) : undefined
}

export function parseStickerMessage(value) {
  const sticker = findSticker(value)
  if (!sticker) return { sticker: undefined, caption: value }
  return {
    sticker,
    caption: value.replace(stickerShortcode(sticker.name), '').trim(),
  }
}
