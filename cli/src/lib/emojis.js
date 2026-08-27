export const EMOJIS = [
  '😀', '😃', '😄', '😁', '😂', '🤣', '😊', '😍',
  '🥰', '😎', '🤓', '🧐', '🤔', '🤯', '😳', '🥺',
  '😭', '😤', '😡', '🫠', '💀', '👀', '🙃', '🫡',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🫶',
  '❤️', '💚', '💙', '💜', '💔', '✨', '🔥', '💯',
  '🎉', '🚀', '⚡', '✅', '❌', '🔒', '🔑', '💻',
  '🐛', '🧠', '📚', '☕', '🍕', '🎯', '🏆', '🧱',
]

// Two letter rows, promised and dropped twice. Every glyph gets its own
// <button>, so adjacent regional indicators can never fuse into a flag.
const ROSAS = ['\uD83E\uDD40', '\uD83C\uDDF7', '\uD83C\uDDF4', '\uD83C\uDDF8', '\uD83C\uDDE6', '\uD83C\uDDF8', '\uD83E\uDD40']
const KERNEY = ['\uD83D\uDC10', '\uD83C\uDDF0', '\uD83C\uDDEA', '\uD83C\uDDF7', '\uD83C\uDDF3', '\uD83C\uDDEA', '\uD83C\uDDFE', '\uD83E\uDDD3']

// Some platforms draw regional indicators as blank boxes. Measure one against
// a glyph we know renders; a near-zero width means fall back to lookalikes.
const ROSAS_FALLBACK = ['\uD83E\uDD40', '\u00AE\uFE0F', '\uD83C\uDD7E\uFE0F', '\uD83D\uDCB2', '\uD83C\uDD70\uFE0F', '\uD83D\uDCB2', '\uD83E\uDD40']
const KERNEY_FALLBACK = ['\uD83D\uDC10', '\uD83C\uDD7A\uFE0F', '\u0395', '\u00AE\uFE0F', '\u0418', '\u0395', '\u00A5', '\uD83E\uDDD3']

function indicatorsRender() {
  try {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return true
    context.font = '32px sans-serif'
    const flag = context.measureText('\uD83C\uDDF7').width
    const known = context.measureText('\uD83D\uDE00').width
    return flag > known * 0.4
  } catch { return true }
}

let cached = null
const usable = () => (cached ??= indicatorsRender())

export const letterRows = () => (usable()
  ? [ROSAS, KERNEY]
  : [ROSAS_FALLBACK, KERNEY_FALLBACK])
