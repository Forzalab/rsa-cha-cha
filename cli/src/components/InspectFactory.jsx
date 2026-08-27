// Inspect mode v3 -- the RSA line as a Factorio floor.
//
// Five stations wired in a U. Type in station 1; every number downstream
// re-runs. The star fires at station 2, 3 or 4, flips one digit, and damage
// cascades to every station after it. Caged lamps swing over each station:
// warm flare when its digits move, red strobe when it takes a hit.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_SEP, decimalFromText, textFromDecimal, modPow, maxBytesFor } from '../lib/rsa.js'
import { markTakeover, markTier, tooltipLine } from '../lib/ritualState.js'

// An empty box gets the plain invitation, always. "faster, comrade" means
// nothing to somebody who has not typed a character yet.
const FIRST_LINE = 'Type something...\nDon\'t go faster... \uD83E\uDD2B'

const OVALTINE_SRC = '/ovaltine.png' // real asset: cli/public/ovaltine.png

// ---------------------------------------------------------------- ads

const CREATIVES = [
  { top: '敖华田', big: 'DRINK YOUR OVALTINE', small: 'a crummy commercial', tint: '#ffd100' },
  { top: 'DECODER RING', big: 'BE SURE TO TURN TO B-2', small: 'pin included', tint: '#ff8a3d' },
  { top: 'CRACKER JACK', big: 'A PRIZE IN EVERY BOX', small: 'some assembly', tint: '#2dd4bf' },
  { top: 'BAZOOKA JOE', big: 'FORTUNE ON THE WRAPPER', small: 'chew first, read later', tint: '#ff2d78' },
  { top: 'ENIGMA CO.', big: 'THREE ROTORS, ONE PRICE', small: 'refurbished', tint: '#ffd100' },
  { top: '素数', big: 'PRIMES, BULK RATE', small: 'p and q sold as pair', tint: '#8ab4ff' },
]

export function SidebarAd({ onDismiss }) {
  const [i, setI] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % CREATIVES.length), 5000)
    return () => clearInterval(t)
  }, [])
  const c = CREATIVES[i]
  return (
    <div className="relative overflow-hidden border border-[#ffd100]/25 bg-[#12010a]">
      <button type="button" onClick={onDismiss} aria-label="Close" className="absolute right-0 top-0 z-10 grid h-3.5 w-3.5 place-items-center bg-black/60 font-mono text-[8px] leading-none text-[#f4e4c1]/50 hover:text-[#ffd100]">×</button>
      <div key={i} className="ad-swap px-2 py-2">
        <p className="font-mono text-[7px] uppercase tracking-[.24em]" style={{ color: `${c.tint}99` }}>{c.top}</p>
        <p className="mt-0.5 text-[11px] font-black leading-tight" style={{ color: c.tint }}>{c.big}</p>
        <p className="mt-0.5 font-mono text-[8px] text-[#f4e4c1]/35">{c.small}</p>
      </div>
      {!failed && <img src={OVALTINE_SRC} alt="" onError={() => setFailed(true)} className="h-10 w-full object-cover opacity-45" />}
      <div className="flex gap-0.5 px-2 pb-1">
        {CREATIVES.map((_, n) => <span key={n} className={`h-0.5 flex-1 ${n === i ? 'bg-[#ffd100]' : 'bg-white/12'}`} />)}
      </div>
    </div>
  )
}

export function OvaltineAd({ onSkip }) {
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4">
      <div className="w-[min(46rem,94vw)] border-4 border-[#ffd100] bg-[#12010a] shadow-[10px_10px_0_rgba(0,0,0,.6)]">
        <p className="border-b-2 border-[#ffd100]/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[.24em] text-[#ffd100]/70">敖华田</p>
        <div className="grid aspect-[4/3] place-items-center bg-[#1c0309] p-3">
          {failed
            ? <div className="text-center">
                <p className="text-6xl">🥛</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-[#ffd100]">DRINK YOUR OVALTINE</p>
              </div>
            : <img src={OVALTINE_SRC} alt="" onError={() => setFailed(true)} className="max-h-full w-full object-contain" />}
        </div>
        <div className="flex justify-end border-t-2 border-[#ffd100]/60 p-3">
          <button type="button" disabled={!ready} onClick={onSkip}
            className={`relative overflow-hidden border-2 px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition ${ready ? 'border-[#4a0410] bg-[#ffd100] text-[#4a0410] shadow-[0_3px_0_#4a0410] hover:-translate-y-0.5' : 'cursor-wait border-[#ffd100]/30 text-[#ffd100]/45'}`}>
            {!ready && <span className="skip-fill absolute inset-0 bg-[#ffd100]/20" />}
            <span className="relative">skip ▶▶</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- helpers

function clipBytes(text, limit) {
  const coder = new TextEncoder()
  if (coder.encode(text).length <= limit) return text
  let out = ''
  for (const ch of text) {
    if (coder.encode(out + ch).length > limit) break
    out += ch
  }
  return out
}

const flipAt = (s, at, d) => s.slice(0, at) + d + s.slice(at + 1)
const shorten = (v, keep = 24) => {
  const s = String(v)
  return s.length <= keep * 2 ? s : `${s.slice(0, keep)}…${s.slice(-keep)}`
}

function Digits({ value, rogueAt }) {
  const s = String(value)
  if (rogueAt == null || rogueAt >= s.length) return <>{shorten(s)}</>
  const pre = s.slice(Math.max(0, rogueAt - 11), rogueAt)
  const post = s.slice(rogueAt + 1, rogueAt + 12)
  return <>{rogueAt > 11 ? '…' : ''}{pre}<span className="rogue">{s[rogueAt]}</span>{post}{rogueAt + 12 < s.length ? '…' : ''}</>
}

// ---------------------------------------------------------------- parts

// One lamp only, and it hangs off the bottom of the WRITE box. Swings and
// runs hot while the operator types.
// E and N are what somebody needs to encrypt to you, so they have to leave
// this panel. navigator.clipboard is gated on a secure context and the site
// is served over plain http -- the same trap that killed crypto.randomUUID on
// the first deploy. execCommand is the fallback that still works there.
function CopyBit({ label, value, beg = false }) {
  const [done, setDone] = useState(false)
  // Once somebody has copied it, the hint has done its job. An affordance
  // that keeps waving after you obeyed it is just nagging.
  const [seen, setSeen] = useState(false)
  const copy = (event) => {
    event.stopPropagation()
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value)
      else throw new Error('no clipboard api')
    } catch {
      const pad = document.createElement('textarea')
      pad.value = value
      pad.setAttribute('readonly', '')
      pad.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
      document.body.appendChild(pad)
      pad.select()
      try { document.execCommand('copy') } catch { /* nothing left to try */ }
      pad.remove()
    }
    setDone(true)
    setSeen(true)
    setTimeout(() => setDone(false), 900)
  }
  const begging = beg && !seen
  return (
    <button type="button" onClick={copy} title={`Copy ${value}`} aria-label={`Copy ${value}`}
      className={`copybit ${begging ? 'copybit-beg' : ''}`}>
      {begging && <span className="copybit-ghost" aria-hidden="true">copy</span>}
      <span>{label}</span>
      <svg viewBox="0 0 14 14" className="copybit-mark" aria-hidden="true">
        {done
          ? <path d="M2.6 7.4l3 3 5.8-6.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          : <>
              <rect x="4.9" y="4.9" width="6.6" height="6.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9.1 2.6H2.5v6.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </>}
      </svg>
    </button>
  )
}

const MarkOk = () => (
  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 6.2l2.6 2.6L10 3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const MarkBad = () => (
  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M6 2v5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="6" cy="10" r="1.2" fill="currentColor" /></svg>
)

// `dead` is damage -- red, burning. `off` is a line nobody is feeding: grey,
// still, and carrying nothing. Two different facts, two different looks.
function Pipe({ digits, reversed = false, dead = false, off = false, heat = 0, flowKey = 0, className = '' }) {
  return (
    <div className={`pipe ${off ? 'pipe-off' : dead ? 'pipe-dead' : ''} ${reversed ? 'pipe-rev' : ''} ${className}`}>
      <span className="pipe-fluid" />
      {!dead && !off && flowKey > 0 && <span key={flowKey} className="pipe-chevrons" aria-hidden="true">❯❯❯❯❯❯❯❯</span>}
      {(off ? [] : digits).map((d, i) => (
        <span key={i} className="pipe-bit" style={{
          animationDelay: `${i * 0.42}s`, top: `${18 + (i % 3) * 26}%`,
          animationDuration: `${2.5 / (1 + heat * 2.5)}s`,
          textShadow: heat > 0.05 ? `0 0 ${7 + heat * 12}px rgba(255,232,115,${0.9 + heat * 0.1}), 0 0 ${heat * 22}px rgba(180,255,120,${heat}), 0 0 14px rgba(0,0,0,.95)` : undefined,
        }}>{d}</span>
      ))}
    </div>
  )
}

function Station({ n, tone, seal, onSeal, innerRef, footer, rail, head, editable = false, sealed = false, reject = 0, children }) {
  // Two class names, one animation each. Re-adding a class React never removed
  // does not restart a CSS animation, so consecutive rejections alternate.
  const shake = reject === 1 ? 'station-reject-a' : reject === 2 ? 'station-reject-b' : ''
  return (
    <div ref={innerRef} className={`station relative z-10 w-44 shrink-0 ${tone === 'danger' ? 'station-hit' : tone === 'hot' ? 'station-live' : tone === 'off' ? 'station-off' : ''} ${editable ? 'station-console' : ''} ${sealed ? 'station-glass' : ''} ${shake}`}>
      <div className="station-plate">
        <span className="rivet" style={{ left: 4, top: 4 }} /><span className="rivet" style={{ right: 4, top: 4 }} />
        <span className="rivet" style={{ left: 4, bottom: 4 }} /><span className="rivet" style={{ right: 4, bottom: 4 }} />
        <div className="flex items-center gap-1.5 border-b border-[#ffd100]/25 px-2 py-1">
          <span className="grid min-h-5 min-w-5 place-items-center border border-[#ffd100]/60 bg-[#ffd100]/10 px-1 font-mono text-[11px] font-black text-[#ffd100]">{n}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {editable && <span className="station-edit-tag">edit</span>}
            {head}
            {seal != null && (
              <button type="button" onClick={onSeal} aria-label="signature"
                className={`grid h-5 w-5 place-items-center rounded-full border font-mono text-[9px] font-black ${seal ? 'border-[#2dd4bf] bg-[#2dd4bf]/15 text-[#2dd4bf]' : 'seal-panic border-[#ff2d78] bg-[#ff2d78]/20 text-[#ff2d78]'}`}>
                {seal ? <MarkOk /> : <MarkBad />}
              </button>
            )}
          </span>
        </div>
        <div className="h-20 overflow-y-auto break-all p-2 font-mono text-[10px] leading-4 text-[#fff6dc]/85">
          {sealed && <span className="glass-cover" aria-hidden="true" />}
          {children}
        </div>
      </div>
      {rail}
      {footer}
      {tone === 'danger' && <>
        <span className="smoke" style={{ left: '14%', animationDelay: '0s',    '--puff': 1.25 }} />
        <span className="smoke" style={{ left: '33%', animationDelay: '.42s',  '--puff': .85 }} />
        <span className="smoke" style={{ left: '50%', animationDelay: '.86s',  '--puff': 1.45 }} />
        <span className="smoke" style={{ left: '68%', animationDelay: '1.28s', '--puff': .95 }} />
        <span className="smoke" style={{ left: '85%', animationDelay: '1.7s',  '--puff': 1.15 }} />
      </>}
    </div>
  )
}

function RayStar({ armed, onFire, eye = 0, gaze = { x: 0, y: 0 } }) {
  return (
    <button type="button" onClick={onFire}
      aria-label="cosmic ray" className="ray-star relative z-20 grid h-16 w-16 place-items-center bg-transparent">
      <svg viewBox="0 0 64 64" className={`absolute inset-0 star-outer ${armed ? 'star-armed' : ''}`}>
        <polygon points="32,3 39,22 60,22 43,35 49,56 32,44 15,56 21,35 4,22 25,22" fill="none" stroke="#ffd100" strokeWidth="2.5" />
      </svg>
      <svg viewBox="0 0 64 64" className={`absolute inset-3 star-inner ${armed ? 'star-armed' : ''}`}>
        <polygon points="32,8 46,32 32,56 18,32" fill="#ffd100" opacity=".9" />
      </svg>
      {eye > 0 && (
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute inset-0" style={{ opacity: eye }}>
          <ellipse cx="32" cy="32" rx="13" ry="8" fill="#fff8ee" />
          <circle cx={32 + gaze.x} cy={32 + gaze.y} r="5.2" fill="#0d0107" />
          <circle cx={32 + gaze.x + 1.6} cy={32 + gaze.y - 1.6} r="1.5" fill="#fff8ee" opacity=".8" />
          <path d="M19 32a13 8 0 0 0 26 0" fill="none" stroke="#7a5f24" strokeWidth="1.4" />
        </svg>
      )}
    </button>
  )
}

const TIERS = [60, 100, 130]

// Five characters is one word. Five second window, so a full window holds
// wpm/12 words. Typing stops, the window drains on its own.
function useWpm() {
  const events = useRef([])
  const lastLen = useRef(0)
  const [wpm, setWpm] = useState(0)

  const recompute = useCallback(() => {
    const now = Date.now()
    events.current = events.current.filter((e) => now - e.t < 5000)
    const chars = events.current.reduce((sum, e) => sum + e.n, 0)
    setWpm(Math.round((chars / 5) * 12))
  }, [])

  const feed = useCallback((len) => {
    const delta = len - lastLen.current
    lastLen.current = len
    if (delta > 0) events.current.push({ t: Date.now(), n: delta })
    recompute()
  }, [recompute])

  // A paste moves the text length without being typing. Resync slides the
  // cursor past it silently; skipping it would make the next real keystroke
  // compute a negative delta and go uncounted.
  const resync = useCallback((len) => {
    lastLen.current = len
  }, [])

  const reset = useCallback(() => {
    events.current = []
    setWpm(0)
  }, [])

  useEffect(() => {
    const id = setInterval(recompute, 300)
    return () => clearInterval(id)
  }, [recompute])

  return { wpm, feed, resync, reset }
}

// Fixed three reels. Leading zeros stay in the layout but go invisible, so
// 9 -> 10 -> 100 never shifts anything sideways.
// Below 20 wpm this is just the station number, indistinguishable from 2..5.
// Past 20 the tag widens and the reels start turning. Nobody is told.
const COUNTER_WAKE = 20

function Counter({ value, idle, hot, rage }) {
  const woken = value >= COUNTER_WAKE
  const shown = String(Math.min(999, value))
  const digits = shown.padStart(3, '0').split('')
  const lead = shown.padStart(3, '0').search(/[1-9]/)
  // The sleeping face is the station number. It was literal '1' back when the
  // counter could only ever live on station 1; the moment it started moving
  // between the two consoles, station 5 started calling itself 1.
  if (!woken) return <span className="counter counter-idle">{idle}</span>
  return (
    <span className={`counter counter-woke ${hot ? 'counter-hot' : ''} ${rage ? 'counter-rage' : ''}`}>
      {digits.map((d, i) => (
        <span key={i} className="reel" style={{ opacity: i < lead ? 0 : 1, width: i < lead ? 0 : undefined }}>
          <span className="reel-strip" style={{ transform: `translateY(-${Number(d)}em)` }}>
            {'0123456789'.split('').map((n) => <span key={n} className="reel-cell">{n}</span>)}
          </span>
        </span>
      ))}
    </span>
  )
}

// Fills as you type, drains the moment you slow. The drain is the point.
//
// It used to be an 8px rail bolted to station 1, which tied the whole glory
// system to one box and made typing into station 5 look unscored. A bar
// across the top belongs to the floor, not to a station -- so both consoles
// feed the same one and nothing has to move when the direction flips.
// No number on it. A gauge you cannot read is a gauge you keep watching, and
// the only quantity that matters is whether it is still climbing.
//
// The track measures 0..100, so the second tick is the lip of the vessel
// rather than a mark two thirds along. Past it the fill has nowhere to go and
// stops obeying the housing -- it crawls out the right side, green, fuming.
function GloryBar({ wpm, tier, ratchet }) {
  const fill = Math.min(1, wpm / TIERS[1])
  const spill = Math.max(0, Math.min(1, (wpm - TIERS[1]) / (TIERS[2] - TIERS[1])))
  return (
    <div className={`glorybar glorybar-t${tier} ${ratchet ? 'glorybar-ratchet' : ''}`}>
      <div className="glorybar-rig">
        <div className="glorybar-track">
          <div className="glorybar-fill" style={{ width: `${fill * 100}%` }} />
          <span className="glorybar-notches" aria-hidden="true" />
          <span className={`glorybar-tick ${wpm >= TIERS[0] ? 'glorybar-tick-lit' : ''}`}
            style={{ left: `${(TIERS[0] / TIERS[1]) * 100}%` }} />
        </div>
        {spill > 0 && (
          <span className="glorybar-spill" aria-hidden="true"
            style={{ width: `${16 + spill * 104}px`, '--spill': spill }}>
            <span className="glorybar-ooze" />
            <span className="glorybar-fume" />
            <span className="glorybar-fume" style={{ animationDelay: '.6s' }} />
            <span className="glorybar-fume" style={{ animationDelay: '1.2s' }} />
          </span>
        )}
      </div>
    </div>
  )
}

// Below 100 wpm the field is a texture you are not meant to read. The veil
// only opens across the last tick, so the boxes stay the loudest thing on
// screen until the room has already been earned.
const VEIL_FLOOR = 100 / 130

function MatrixField({ seed, heat = 0 }) {
  const veil = Math.max(0, (heat - VEIL_FLOOR) / (1 - VEIL_FLOOR))
  // A cipher of "0" is six characters after repeat, so every column past the
  // first came back empty. Pad the seed before slicing.
  const base = String(seed || '0') + '0173925486'
  const pool = base.repeat(Math.ceil(800 / base.length)).slice(0, 800)
  const cols = useMemo(() => Array.from({ length: 22 }, (_, c) => ({
    left: `${(c * 100) / 22}%`,
    delay: `${(c * 0.31) % 4}s`,
    dur: `${3 + ((c * 7) % 5) * 0.6}s`,
    text: pool.slice((c * 31) % 700, ((c * 31) % 700) + 34),
  })), [pool])
  return (
    <div className="matrix-field pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {cols.map((c, i) => (
        <span key={i} className="matrix-col" style={{ left: c.left, animationDelay: c.delay, animationDuration: c.dur, opacity: 0.018 + veil * 0.2, color: `rgb(${Math.round(96 + veil * 159)},${Math.round(76 + veil * 156)},${Math.round(26 + veil * 89)})` }}>{c.text}</span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- factory

const TARGETS = ['pack', 'lock', 'wire']
const STAGE_OF = { pack: 2, lock: 3, wire: 4 }

export function InspectFactory({ message, keypair, onClose, onRitual }) {
  const [draft, setDraft] = useState(message?.plaintext || 'HELLO')
  // Which end of the line is the source. 'back' makes station 5 drive and
  // station 1 mirror, which is the shape of decrypting a message you were
  // handed rather than composing one.
  // 'cipher' is the third source: station 3 holds a pasted ciphertext and the
  // plaintext ends become read-outs. It is a number, so none of the text
  // machinery (byte cap, packing) applies to it.
  // Two directions only. Station 5 holds recovered plaintext, so composing
  // from it was never sound -- there is nothing upstream of a result.
  const [dir, setDir] = useState('fwd')
  const [cipherDraft, setCipherDraft] = useState('')
  const [ray, setRay] = useState(null)
  const [beam, setBeam] = useState(null)
  const [sealAt, setSealAt] = useState(null)
  const [pulse, setPulse] = useState(0)
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  const [tip, setTip] = useState(false)
  // A keystroke sends one chevron train down every pipe in the direction the
  // line is running. The key restarts the animation; it dies on its own.
  const [flowKey, setFlowKey] = useState(0)
  const [ratchet, setRatchet] = useState(false)
  // { which, n } -- n alternates 1/2 so a held key keeps re-firing the shake.
  const [reject, setReject] = useState(null)

  const { wpm, feed, resync, reset: resetWpm } = useWpm()
  // Set by onPaste, consumed by the next onChange. Pastes update text but are
  // exempt from the wpm counter, the lamp, the coins, and the ritual chain.
  const pasteRef = useRef(false)
  // And the idle "faster, comrade" nag stays quiet until real typing resumes.
  const pastedSinceKeyRef = useRef(false)
  const coinsRef = useRef(null)
  const lastTierRef = useRef(0)

  const panelRef = useRef(null)
  const starRef = useRef(null)
  const refs = { pack: useRef(null), lock: useRef(null), wire: useRef(null) }

  const E = BigInt(keypair.publicKey.value)
  const N = BigInt(keypair.publicKey.modulus)
  const D = BigInt(keypair.privateKey.value)
  const limit = maxBytesFor(keypair.publicKey.modulus)

  // The math never changes with direction. Only the string feeding it does.
  const source = draft
  const locked = dir === 'cipher'   // stations 4 and 5 are downstream of nothing

  const line = useMemo(() => {
    if (dir === 'cipher') {
      const digits = cipherDraft
      let m = 0n
      let recovered = ''
      if (digits) {
        try {
          // A pasted ciphertext may be several blocks. Every block is one
          // operation; the plaintext is the pieces put back in order.
          const blocks = digits.split(BLOCK_SEP).filter((part) => part.length)
          m = modPow(BigInt(blocks[0]), D, N)
          recovered = blocks
            .map((part) => textFromDecimal(modPow(BigInt(part), D, N)))
            .join('')
        } catch { recovered = '' }
      }
      // No signature lane: a pasted cipher carries no signature to verify,
      // and pretending otherwise would put a red (!) on an honest decrypt.
      return { text: recovered, m: m.toString(), cipher: digits || '0',
               wire: digits || '0', recovered, sig: '', attested: '',
               ok: !!digits && recovered !== '', sigOk: null }
    }
    const text = clipBytes(source, limit)
    const m = decimalFromText(text).toString()
    const mWire = ray?.target === 'pack' ? flipAt(m, Math.min(ray.at, m.length - 1), ray.digit) : m
    const cipher = modPow(BigInt(mWire), E, N).toString()
    const cipherShown = ray?.target === 'lock' ? flipAt(cipher, Math.min(ray.at, cipher.length - 1), ray.digit) : cipher
    const wire = ray?.target === 'wire' ? flipAt(cipherShown, Math.min(ray.at, cipherShown.length - 1), ray.digit) : cipherShown
    let recovered
    try { recovered = textFromDecimal(modPow(BigInt(wire), D, N)) } catch { recovered = '' }
    const sig = modPow(BigInt(mWire), D, N).toString()
    const sigShown = ray && ray.target !== 'pack' ? flipAt(sig, Math.min(ray.at, sig.length - 1), ray.digit) : sig
    let attested
    try { attested = textFromDecimal(modPow(BigInt(sigShown), E, N)) } catch { attested = '' }
    return { text, m: mWire, cipher: cipherShown, wire, recovered, sig: sigShown, attested, ok: recovered === text, sigOk: attested === text }
  }, [source, cipherDraft, dir, ray, E, N, D, limit])

  // Damage cascades: a hit at stage i breaks every stage from i onward.
  const hitStage = ray ? STAGE_OF[ray.target] : Infinity
  // Damage always travels downstream. Downstream flips with the direction.
  const broken = (stage) => (dir === 'cipher'
    ? ray != null && stage <= hitStage
    : stage >= hitStage)
  const toneOf = (stage) => (broken(stage) ? 'danger' : 'idle')
  // A pipe carries whatever the station behind it produced. Kill it only when
  // that feeder is broken -- a hit on station 3 does not poison 2 -> 3, which
  // is still delivering clean digits into the wreck. Upstream flips with dir.
  const pipeDead = (lo, hi) => broken(dir === 'cipher' ? hi : lo)
  const rogueOf = (t, v) => (ray?.target === t ? Math.min(ray.at, String(v).length - 1) : null)

  useEffect(() => {
    if (!pulse) return
    const t = setTimeout(() => setPulse(0), 700)
    return () => clearTimeout(t)
  }, [pulse])

  useEffect(() => {
    if (!reject) return
    const t = setTimeout(() => setReject(null), 380)
    return () => clearTimeout(t)
  }, [reject])

  const heat = Math.min(1, wpm / 130)
  const tier = wpm >= 130 ? 3 : wpm >= 100 ? 2 : wpm >= 60 ? 1 : 0

  // Crossing a tick kicks the gauge and is remembered for the whole session.
  useEffect(() => {
    if (tier > lastTierRef.current) {
      markTier(tier)
      // 100 wpm announces you. 130 takes the room.
      if (tier >= 2) {
        if (tier >= 3) markTakeover()
        onRitual?.(tier)
      }
      setRatchet(true)
      const id = setTimeout(() => setRatchet(false), 420)
      lastTierRef.current = tier
      return () => clearTimeout(id)
    }
    if (tier < lastTierRef.current) lastTierRef.current = tier
  }, [tier, onRitual])

  // Idle nagging. Silent the moment anything is being typed.
  useEffect(() => {
    if (wpm > 0) { setTip(false); return }
    let visible = false
    const id = setInterval(() => {
      // Somebody who just pasted is not idling; taunting them for zero wpm
      // over a full box reads as broken. Quiet until keys are struck again.
      if (pastedSinceKeyRef.current) return
      visible = !visible
      setTip(visible)
      if (visible) setTimeout(() => setTip(false), 1500)
    }, 4000)
    return () => clearInterval(id)
  }, [wpm])

  // No mousemove on touch devices, so the eye wanders on its own instead of
  // sitting dead center. Fine pointers keep the cursor-tracking below.
  useEffect(() => {
    if (tier < 2) return
    if (window.matchMedia?.('(pointer: fine)').matches) return
    const id = window.setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      setGaze({ x: Math.cos(angle) * 3.2, y: Math.sin(angle) * 3.2 })
    }, 2500)
    return () => window.clearInterval(id)
  }, [tier])

  // Pupil follows the cursor, capped so it reads as a glance not a lurch.
  const trackRef = useRef(0)
  const onPanelMove = (event) => {
    if (tier < 2) return
    const now = Date.now()
    if (now - trackRef.current < 100) return
    trackRef.current = now
    const box = starRef.current?.getBoundingClientRect()
    if (!box) return
    const dx = event.clientX - (box.x + box.width / 2)
    const dy = event.clientY - (box.y + box.height / 2)
    const dist = Math.hypot(dx, dy) || 1
    setGaze({ x: (dx / dist) * 3.2, y: (dy / dist) * 3.2 })
  }

  // Coins are pure DOM. Putting them through React would re-render the whole
  // floor on every keystroke for confetti nobody clicks.
  const burstCoin = () => {
    const host = coinsRef.current
    if (!host || host.childNodes.length >= 12) return
    const coin = document.createElement('span')
    coin.className = 'coin'
    coin.textContent = String(Math.floor(Math.random() * 10))
    coin.style.left = `${10 + Math.random() * 80}%`
    coin.style.top = `${15 + Math.random() * 60}%`
    host.appendChild(coin)
    setTimeout(() => coin.remove(), 700)
  }

  // Both boxes feed the same counter, so the gauge, the coins, the eye and the
  // quake behave identically whichever end you are typing into.
  // A soft keyboard's clipboard menu does not always fire `paste`. Length is
  // the tell that always works: nobody types five characters in one event.
  const KEYSTROKE_MAX = 4
  const typeInto = (which) => (event) => {
    const raw = event.target.value
    const prev = source.length
    const pasted = pasteRef.current || Math.abs(event.target.value.length - prev) > KEYSTROKE_MAX
    pasteRef.current = false
    // The modulus is the wall. Refuse the character and shake the plate --
    // that lands harder than a meter creeping toward a number nobody reads.
    const value = clipBytes(raw, limit)
    if (value !== raw) setReject((r) => ({ which, n: r && r.n === 1 ? 2 : 1 }))
    // Touching station 1 re-opens the whole line: 4 and 5 come back on.
    setDir('fwd')
    setDraft(value)
    setFlowKey(Date.now())
    setRay(null); setSealAt(null)
    if (pasted) {
      // Text lands, glory does not. The counter's length cursor still has to
      // move or the next keystroke registers as a negative delta.
      pastedSinceKeyRef.current = true
      resync(value.length)
      return
    }
    pastedSinceKeyRef.current = false
    setPulse(Date.now())
    feed(value.length)
    if (heat > 0.4 && Math.random() < 0.15) burstCoin()
  }

  // Station 3. Digits only, and the number stays under N -- anything else is
  // refused outright with the same shake as the byte wall. A real ciphertext
  // is already reduced mod N, so it always passes.
  const typeCipher = (event) => {
    const raw = event.target.value
    const pasted = pasteRef.current || Math.abs(raw.length - cipherDraft.length) > KEYSTROKE_MAX
    pasteRef.current = false
    // Whitespace is noise from copy-paste. Commas are block separators and
    // survive; everything between them still has to be a number under N.
    const digits = raw.replace(/\s/g, '')
    const blocks = digits.split(BLOCK_SEP).filter((part) => part.length)
    const bad = /[^\d,]/.test(digits) || blocks.some((part) => BigInt(part) >= N)
    if (bad) {
      setReject((r) => ({ which: 'cipher', n: r && r.n === 1 ? 2 : 1 }))
      return
    }
    setDir('cipher')
    setCipherDraft(digits)
    setFlowKey(Date.now())
    setRay(null); setSealAt(null)
    if (pasted) { pastedSinceKeyRef.current = true; resync(digits.length); return }
    pastedSinceKeyRef.current = false
    setPulse(Date.now())
    feed(digits.length)
  }
  const markPaste = () => { pasteRef.current = true }

  // A ciphertext is not something anybody composes by hand, so station 3 does
  // not accept authored characters at all. `insertFromPaste` and the delete
  // types still come through -- clipboard in, clipboard out, nothing typed.
  //
  // A PASTE button that reads the clipboard for you is not possible here:
  // navigator.clipboard.readText needs a secure context and this is served
  // over plain http. So the button only puts the caret where it belongs.
  const cipherRef = useRef(null)
  const refuseTyping = (event) => {
    if (String(event.nativeEvent?.inputType || '').startsWith('insertFromPaste')) return
    if (String(event.nativeEvent?.inputType || '').startsWith('delete')) return
    event.preventDefault()
    setReject((r) => ({ which: 'cipher', n: r && r.n === 1 ? 2 : 1 }))
  }
  const refuseEnter = (event) => { if (event.key === 'Enter') event.preventDefault() }

  const fire = () => {
    // Station 3 is the operator's own paste and 4/5 are switched off, so in
    // cipher mode the only thing downstream worth breaking is station 2.
    const reachable = locked ? ['pack'] : TARGETS
    const target = reachable[Math.floor(Math.random() * reachable.length)]
    const from = starRef.current?.getBoundingClientRect()
    const to = refs[target].current?.getBoundingClientRect()
    const box = panelRef.current?.getBoundingClientRect()
    if (from && to && box) {
      const x1 = from.x + from.width / 2 - box.x, y1 = from.y + from.height / 2 - box.y
      const x2 = to.x + to.width / 2 - box.x, y2 = to.y + to.height / 2 - box.y
      setBeam({ x: x1, y: y1, len: Math.hypot(x2 - x1, y2 - y1), angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, key: Date.now() })
      setTimeout(() => setBeam(null), 700)
    }
    const probe = { pack: line.m, lock: line.cipher, wire: line.wire }[target]
    setTimeout(() => {
      const at = 1 + Math.floor(Math.random() * Math.max(1, probe.length - 1))
      // Never roll the digit that is already sitting there, or the ray lands
      // and nothing happens. Shift by 1..9 so the flip is always a real flip.
      const digit = String((Number(probe[at] ?? '0') + 1 + Math.floor(Math.random() * 9)) % 10)
      setRay({ target, at, digit })
    }, 260)
  }

  const bits = (src, n) => Array.from({ length: n }, (_, i) => src[(i * 7 + 3) % src.length] ?? '0')

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/90 p-3 sm:p-8" onClick={onClose}>
      <div ref={panelRef} onClick={(e) => e.stopPropagation()} onMouseMove={onPanelMove}
        className={`relative mx-auto w-fit max-w-full overflow-hidden border-4 border-[#ffd100] bg-[#0d0107] p-4 shadow-[12px_12px_0_rgba(0,0,0,.6)] sm:p-6 ${tier >= 2 ? 'panel-quake' : ''}`}>
        <MatrixField seed={line.cipher} heat={heat} />
        <div ref={coinsRef} className="coin-host pointer-events-none absolute inset-0 z-20" />

        <div className="relative z-10 mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] text-[#f4e4c1]/45">🔑</span>
          <CopyBit label={E.toString()} value={E.toString()} />
          <span className="font-mono text-[10px] text-[#f4e4c1]/25">·</span>
          <CopyBit beg label={shorten(N.toString(), 10)} value={N.toString()} />
          <button type="button" onClick={onClose} aria-label="close" className="ml-auto grid h-7 w-7 place-items-center border-2 border-[#ffd100]/60 font-mono text-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410]">×</button>
        </div>

        <GloryBar wpm={wpm} tier={tier} ratchet={ratchet} />

        <div className="factory-scroll relative z-10 overflow-x-auto px-4 pb-12 pt-14">
          <div className="grid w-max" style={{ gridTemplateColumns: 'auto 4rem auto 4rem auto', gridTemplateRows: 'auto 7rem auto' }}>

            <Station editable reject={reject?.which === 'fwd' ? reject.n : 0} n={dir === 'fwd' ? <Counter value={wpm} idle="1" hot={tier >= 1} rage={tier >= 2} /> : '1'} tone={dir === 'fwd' ? 'hot' : toneOf(1)}
              rail={tip ? <span className="tip-bubble">{draft.length === 0 ? FIRST_LINE : tooltipLine()}</span> : null}>
              <textarea value={dir === 'cipher' ? (line.recovered || '') : source} rows={3}
                onChange={typeInto('fwd')} onPaste={markPaste}
                placeholder={dir === 'cipher' && !line.ok ? '\u25a1\u25a1\u25a1' : undefined}
                className={`w-full resize-none bg-transparent font-mono text-[11px] caret-[#ffd100] outline-none placeholder:text-[#fff6dc]/30 ${dir === 'cipher' && !line.ok ? 'text-[#ff2d78]' : 'text-white'}`} />
            </Station>
            <Pipe digits={bits(line.m, 6)} heat={heat} flowKey={flowKey} dead={pipeDead(1, 2)} reversed={locked} />
            <Station n="2" sealed tone={toneOf(2)} innerRef={refs.pack} seal={!broken(2)} onSeal={() => setSealAt(sealAt === 2 ? null : 2)}>
              <Digits value={line.m} rogueAt={rogueOf('pack', line.m)} />
            </Station>
            <Pipe digits={bits(line.cipher, 6)} heat={heat} flowKey={flowKey} dead={pipeDead(2, 3)} reversed={locked} />
            <Station sealed reject={reject?.which === 'cipher' ? reject.n : 0}
              n={locked ? <Counter value={wpm} idle="3" hot={tier >= 1} rage={tier >= 2} /> : '3'}
              tone={locked ? 'hot' : toneOf(3)} innerRef={refs.lock}
              head={<span className="flex items-center gap-1">
                <button type="button" onClick={() => cipherRef.current?.focus()}
                  className="station-edit-tag">paste</button>
                {locked && <button type="button" onClick={() => { setCipherDraft(''); setDir('fwd') }}
                  className="station-edit-tag">×</button>}
              </span>}
              seal={locked ? null : !broken(3)} onSeal={() => setSealAt(sealAt === 3 ? null : 3)}>
              <textarea ref={cipherRef} rows={3} onChange={typeCipher} onPaste={markPaste}
                onBeforeInput={refuseTyping} onKeyDown={refuseEnter}
                value={locked ? cipherDraft : line.cipher}
                placeholder="paste a cipher here"
                className="relative z-[4] w-full resize-none bg-transparent font-mono text-[10px] text-[#fff6dc]/85 caret-[#ffd100] outline-none placeholder:text-[#fff6dc]/30" />
            </Station>

            <div className="col-span-4 grid translate-y-2 place-items-center" ref={starRef}><RayStar armed={!!ray} onFire={fire} eye={tier >= 2 ? Math.min(1, (wpm - 100) / 30 + 0.35) : 0} gaze={gaze} /></div>
            <div className="grid place-items-center"><Pipe digits={bits(line.wire, 4)} heat={heat} flowKey={flowKey} off={locked} dead={pipeDead(3, 4)} className="pipe-v" /></div>

            <Station n="5" sealed tone={locked ? 'off' : toneOf(5)} seal={locked ? null : line.sigOk} onSeal={() => setSealAt(sealAt === 5 ? null : 5)}>
              <div className={`whitespace-pre-wrap break-all ${locked ? 'text-[#fff6dc]/20' : line.ok ? 'text-white' : 'text-[#ff2d78]'}`}>
                {locked ? '□□□' : (line.recovered || '□□□')}
              </div>
            </Station>
            <Pipe digits={bits(line.wire, 10)} heat={heat} flowKey={flowKey} reversed off={locked} dead={pipeDead(4, 5)} className="col-span-3" />
            <Station n="4" sealed tone={locked ? 'off' : toneOf(4)} innerRef={refs.wire}
              seal={locked ? null : !broken(4)} onSeal={() => setSealAt(sealAt === 4 ? null : 4)}>
              {locked ? <span className="text-[#fff6dc]/20">—</span>
                      : <Digits value={line.wire} rogueAt={rogueOf('wire', line.wire)} />}
            </Station>
          </div>
        </div>

        {sealAt != null && dir !== 'cipher' && (
          <div className="relative z-20 mt-3 w-fit border-2 border-[#ffd100]/60 bg-[#12010a] p-2.5 font-mono text-[10px] leading-5 text-[#fff6dc]/85 shadow-[6px_6px_0_rgba(0,0,0,.5)]">
            <p className="break-all">m<sup>D</sup> mod N · <Digits value={line.sig} rogueAt={ray && ray.target !== 'pack' ? Math.min(ray.at, line.sig.length - 1) : null} /></p>
            <p>s<sup>E</sup> mod N · <span className={line.sigOk ? 'text-[#2dd4bf]' : 'text-[#ff2d78]'}>{line.sigOk ? `"${line.attested}"` : '□□□'}</span></p>
          </div>
        )}

        {beam && <div key={beam.key} className="laser pointer-events-none absolute z-30" style={{ left: beam.x, top: beam.y, width: beam.len, transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 50%' }} />}
      </div>
    </div>
  )
}
