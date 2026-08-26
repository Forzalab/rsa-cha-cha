// Inspect mode v3 -- the RSA line as a Factorio floor.
//
// Five stations wired in a U. Type in station 1; every number downstream
// re-runs. The star fires at station 2, 3 or 4, flips one digit, and damage
// cascades to every station after it. Caged lamps swing over each station:
// warm flare when its digits move, red strobe when it takes a hit.

import { useEffect, useMemo, useRef, useState } from 'react'
import { decimalFromText, textFromDecimal, modPow, maxBytesFor } from '../lib/rsa.js'

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
function DeskLamp({ lit }) {
  return (
    <div className={`desklamp ${lit ? 'desklamp-flare' : ''}`}>
      <span className="desklamp-cord" />
      <svg viewBox="0 0 24 30" className="desklamp-body">
        <path d="M8 25h8l2-3H6z" fill="#5a4a2e" />
        <ellipse className="desklamp-bulb" cx="12" cy="14" rx="6" ry="7" />
        <path d="M6 8h12v13a6 6 0 0 1-12 0z" fill="none" stroke="#6b5836" strokeWidth="1.2" />
        <path d="M12 8v13M7 12h10M7 17h10" stroke="#6b5836" strokeWidth=".8" />
      </svg>
      <span className="desklamp-cone" />
    </div>
  )
}

const MarkOk = () => (
  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 6.2l2.6 2.6L10 3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const MarkBad = () => (
  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M6 2v5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="6" cy="10" r="1.2" fill="currentColor" /></svg>
)

function Pipe({ digits, reversed = false, dead = false, className = '' }) {
  return (
    <div className={`pipe ${dead ? 'pipe-dead' : ''} ${reversed ? 'pipe-rev' : ''} ${className}`}>
      <span className="pipe-fluid" />
      {digits.map((d, i) => (
        <span key={i} className="pipe-bit" style={{ animationDelay: `${i * 0.42}s`, top: `${18 + (i % 3) * 26}%` }}>{d}</span>
      ))}
    </div>
  )
}

function Station({ n, tone, seal, onSeal, innerRef, footer, children }) {
  return (
    <div ref={innerRef} className={`station relative z-10 w-44 shrink-0 ${tone === 'danger' ? 'station-hit' : tone === 'hot' ? 'station-live' : ''}`}>
      <div className="station-plate">
        <span className="rivet" style={{ left: 4, top: 4 }} /><span className="rivet" style={{ right: 4, top: 4 }} />
        <span className="rivet" style={{ left: 4, bottom: 4 }} /><span className="rivet" style={{ right: 4, bottom: 4 }} />
        <div className="flex items-center gap-1.5 border-b border-[#ffd100]/25 px-2 py-1">
          <span className="grid h-5 w-5 place-items-center border border-[#ffd100]/60 bg-[#ffd100]/10 font-mono text-[11px] font-black text-[#ffd100]">{n}</span>
          {tone === 'hot' && <span className="ml-auto text-[11px]">✏️</span>}
          {seal != null && (
            <button type="button" onClick={onSeal} aria-label="signature"
              className={`ml-auto grid h-5 w-5 place-items-center rounded-full border font-mono text-[9px] font-black ${seal ? 'border-[#2dd4bf] bg-[#2dd4bf]/15 text-[#2dd4bf]' : 'seal-panic border-[#ff2d78] bg-[#ff2d78]/20 text-[#ff2d78]'}`}>
              {seal ? <MarkOk /> : <MarkBad />}
            </button>
          )}
        </div>
        <div className="h-20 overflow-y-auto break-all p-2 font-mono text-[10px] leading-4 text-[#fff6dc]/85">{children}</div>
      </div>
      {footer}
      {tone === 'danger' && <>
        <span className="smoke" style={{ left: '20%' }} />
        <span className="smoke" style={{ left: '48%', animationDelay: '.55s' }} />
        <span className="smoke" style={{ left: '74%', animationDelay: '1.15s' }} />
      </>}
    </div>
  )
}

function RayStar({ armed, onFire }) {
  const [tip, setTip] = useState(false)
  return (
    <button type="button" onClick={onFire} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
      aria-label="cosmic ray" className="ray-star relative z-20 grid h-16 w-16 place-items-center bg-transparent">
      <svg viewBox="0 0 64 64" className={`absolute inset-0 star-outer ${armed ? 'star-armed' : ''}`}>
        <polygon points="32,3 39,22 60,22 43,35 49,56 32,44 15,56 21,35 4,22 25,22" fill="none" stroke="#ffd100" strokeWidth="2.5" />
      </svg>
      <svg viewBox="0 0 64 64" className={`absolute inset-3 star-inner ${armed ? 'star-armed' : ''}`}>
        <polygon points="32,8 46,32 32,56 18,32" fill="#ffd100" opacity=".9" />
      </svg>
      {tip && <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 border border-[#ffd100]/60 bg-[#12010a] px-1.5 font-mono text-[9px] text-[#ffd100]">zap</span>}
    </button>
  )
}

function MatrixField({ seed, heat = 0 }) {
  const cols = useMemo(() => Array.from({ length: 22 }, (_, c) => ({
    left: `${(c * 100) / 22}%`,
    delay: `${(c * 0.31) % 4}s`,
    dur: `${3 + ((c * 7) % 5) * 0.6}s`,
    text: (seed.repeat(6)).slice(c * 13, c * 13 + 34),
  })), [seed])
  return (
    <div className="matrix-field pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {cols.map((c, i) => (
        <span key={i} className="matrix-col" style={{ left: c.left, animationDelay: c.delay, animationDuration: c.dur, opacity: 0.10 + heat * 0.26, color: heat > 0.05 ? `rgb(${Math.round(45 + heat * 210)},${Math.round(212 + heat * 20)},${Math.round(191 - heat * 76)})` : undefined }}>{c.text}</span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- factory

const TARGETS = ['pack', 'lock', 'wire']
const STAGE_OF = { pack: 2, lock: 3, wire: 4 }

export function InspectFactory({ message, keypair, onClose }) {
  const [draft, setDraft] = useState(message?.plaintext || 'HELLO')
  const [ray, setRay] = useState(null)
  const [beam, setBeam] = useState(null)
  const [sealAt, setSealAt] = useState(null)
  const [pulse, setPulse] = useState(0)

  const panelRef = useRef(null)
  const starRef = useRef(null)
  const refs = { pack: useRef(null), lock: useRef(null), wire: useRef(null) }

  const E = BigInt(keypair.publicKey.value)
  const N = BigInt(keypair.publicKey.modulus)
  const D = BigInt(keypair.privateKey.value)
  const limit = maxBytesFor(keypair.publicKey.modulus)

  const line = useMemo(() => {
    const text = clipBytes(draft, limit)
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
  }, [draft, ray, E, N, D, limit])

  // Damage cascades: a hit at stage i breaks every stage from i onward.
  const hitStage = ray ? STAGE_OF[ray.target] : Infinity
  const broken = (stage) => stage >= hitStage
  const toneOf = (stage) => (broken(stage) ? 'danger' : 'idle')
  const rogueOf = (t, v) => (ray?.target === t ? Math.min(ray.at, String(v).length - 1) : null)

  useEffect(() => {
    if (!pulse) return
    const t = setTimeout(() => setPulse(0), 700)
    return () => clearTimeout(t)
  }, [pulse])

  const bytes = new TextEncoder().encode(draft).length
  const fuel = Math.min(1, bytes / limit)
  const over = bytes > limit

  const fire = () => {
    const target = TARGETS[Math.floor(Math.random() * 3)]
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
    setTimeout(() => setRay({ target, at: 1 + Math.floor(Math.random() * Math.max(1, probe.length - 1)), digit: String(Math.floor(Math.random() * 10)) }), 260)
  }

  const bits = (src, n) => Array.from({ length: n }, (_, i) => src[(i * 7 + 3) % src.length] ?? '0')

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/90 p-3 sm:p-8" onClick={onClose}>
      <div ref={panelRef} onClick={(e) => e.stopPropagation()} className="relative mx-auto w-fit max-w-full overflow-hidden border-4 border-[#ffd100] bg-[#0d0107] p-4 shadow-[12px_12px_0_rgba(0,0,0,.6)] sm:p-6">
        <MatrixField seed={line.cipher} heat={pulse ? 0.5 : 0} />

        <div className="relative z-10 mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] text-[#f4e4c1]/45">🔑 {E.toString()} · {shorten(N.toString(), 10)}</span>
          <button type="button" onClick={onClose} aria-label="close" className="ml-auto grid h-7 w-7 place-items-center border-2 border-[#ffd100]/60 font-mono text-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410]">×</button>
        </div>

        <div className="relative z-10 overflow-x-auto">
          <div className="grid w-max" style={{ gridTemplateColumns: 'auto 4rem auto 4rem auto', gridTemplateRows: 'auto 7rem auto' }}>

            <Station n="1" tone="hot" footer={<DeskLamp lit={!!pulse} />}>
              <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setRay(null); setSealAt(null); setPulse(Date.now()) }} rows={3}
                className="w-full resize-none bg-transparent font-mono text-[11px] text-white caret-[#ffd100] outline-none" />
              <div className="mt-1 h-1.5 w-full bg-black/50">
                <div className={`h-full transition-all ${over ? 'bg-[#ff2d78]' : fuel < 0.75 ? 'bg-[#2dd4bf]' : 'bg-[#ffd100]'}`} style={{ width: `${fuel * 100}%` }} />
              </div>
            </Station>
            <Pipe digits={bits(line.m, 6)} dead={broken(2)} />
            <Station n="2" tone={toneOf(2)} innerRef={refs.pack} seal={!broken(2)} onSeal={() => setSealAt(sealAt === 2 ? null : 2)}>
              <Digits value={line.m} rogueAt={rogueOf('pack', line.m)} />
            </Station>
            <Pipe digits={bits(line.cipher, 6)} dead={broken(3)} />
            <Station n="3" tone={toneOf(3)} innerRef={refs.lock} seal={!broken(3)} onSeal={() => setSealAt(sealAt === 3 ? null : 3)}>
              <Digits value={line.cipher} rogueAt={rogueOf('lock', line.cipher)} />
            </Station>

            <div className="col-span-4 grid translate-y-2 place-items-center" ref={starRef}><RayStar armed={!!ray} onFire={fire} /></div>
            <div className="grid place-items-center"><Pipe digits={bits(line.wire, 4)} reversed dead={broken(4)} className="pipe-v" /></div>

            <Station n="5" tone={toneOf(5)} seal={line.sigOk} onSeal={() => setSealAt(sealAt === 5 ? null : 5)}>
              {line.recovered || '□□□'}
            </Station>
            <Pipe digits={bits(line.wire, 10)} reversed dead={broken(5)} className="col-span-3" />
            <Station n="4" tone={toneOf(4)} innerRef={refs.wire} seal={!broken(4)} onSeal={() => setSealAt(sealAt === 4 ? null : 4)}>
              <Digits value={line.wire} rogueAt={rogueOf('wire', line.wire)} />
            </Station>
          </div>
        </div>

        {sealAt != null && (
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
