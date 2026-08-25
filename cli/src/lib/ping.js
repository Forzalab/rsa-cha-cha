// A two-oscillator chime built at runtime. No asset, no licence, no request —
// which matters more than it sounds: a repo with a .mp3 in it needs an origin
// and a licence line in the README, and this needs neither.
//
// Browsers refuse to start audio until the page has seen a real user gesture,
// so unlock() must be wired to the first click or keypress.

let context = null
let unlocked = false

export function unlockPing() {
  if (unlocked) return
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return
  context ??= new Ctor()
  if (context.state === 'suspended') context.resume()
  unlocked = true
}

export function ping({ volume = 0.16 } = {}) {
  if (!context || context.state !== 'running') return

  const now = context.currentTime
  const out = context.createGain()
  out.gain.setValueAtTime(0.0001, now)
  out.gain.exponentialRampToValueAtTime(volume, now + 0.012)
  out.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
  out.connect(context.destination)

  // A perfect fifth. Two tones read as a chime; one reads as a beep.
  for (const [hz, gain, delay] of [[1244.5, 1, 0], [1864.7, 0.42, 0.045]]) {
    const osc = context.createOscillator()
    const level = context.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(hz, now + delay)
    level.gain.setValueAtTime(gain, now + delay)
    osc.connect(level)
    level.connect(out)
    osc.start(now + delay)
    osc.stop(now + 0.45)
  }
}
