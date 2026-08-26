// Inspect mode v2: the RSA line as a toy factory.
//
// Five machines, two belts, one star. Type in machine 1 and every number
// downstream re-runs. The star fires a laser at machine 2, 3, or 4, flips one
// digit there, and the damage flows down the line. The wax seal by machine 5
// hides the signature math.
//
// Rule of the room: motion means alive, glow means touch me, red means broken.

import { useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { decimalFromText, textFromDecimal, modPow, maxBytesFor } from '../lib/rsa.js'

const OVALTINE_SRC = '/ovaltine.png' // real asset: cli/public/ovaltine.png

// ---------------------------------------------------------------- ad gate

export function OvaltineAd({ onSkip }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4" onClick={onSkip}>
      <div onClick={(e) => e.stopPropagation()} className="w-[min(46rem,94vw)] border-4 border-[#ffd100] bg-[#12010a] shadow-[10px_10px_0_rgba(0,0,0,.6)]">
        <p className="border-b-2 border-[#ffd100]/60 px-4 py-2 text-xs font-bold uppercase tracking-[.22em] text-[#ffd100]">敖华田 · A word from our sponsors</p>
        <div className="grid aspect-[4/3] place-items-center bg-[#1c0309] p-3">
          {failed
            ? <div className="text-center font-mono text-sm">
                <p className="text-5xl">🥛</p>
                <p className="mt-3 text-lg font-bold text-[#ffd100]">BE SURE TO DRINK YOUR OVALTINE</p>
                <p className="mt-2 text-[11px] text-[#f4e4c1]/40">a crummy commercial? — son of a bitch</p>
              </div>
            : <img src={OVALTINE_SRC} alt="Be sure to drink your Ovaltine" onError={() => setFailed(true)} className="max-h-full w-full object-contain" />}
        </div>
        <div className="flex justify-end border-t-2 border-[#ffd100]/60 p-3">
          <button type="button" onClick={onSkip} className="border-2 border-[#4a0410] bg-[#ffd100] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#4a0410] shadow-[0_3px_0_#4a0410] transition hover:-translate-y-0.5">Skip ads ▶▶</button>
        </div>
      </div>
    </div>
  )
}

export function SidebarAd({ onDismiss }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative border-2 border-[#ffd100]/40 bg-[#1c0309] p-2">
      <button type="button" onClick={onDismiss} aria-label="Dismiss ad" className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center border border-[#ffd100]/60 bg-[#12010a] text-[#ffd100]"><X size={11} /></button>
      <p className="text-[9px] uppercase tracking-[.2em] text-[#f4e4c1]/40">sponsored</p>
      {failed
        ? <p className="mt-1 text-[11px] font-bold leading-tight text-[#ffd100]">Be sure to drink your Ovaltine 🥛</p>
        : <img src={OVALTINE_SRC} alt="Ovaltine" onError={() => setFailed(true)} className="mt-1 w-full object-contain" />}
    </div>
  )
}

// ---------------------------------------------------------------- helpers

// Longest prefix of `text` that fits in `limit` bytes.
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

function flipDigitAt(str, at, digit) {
  return str.slice(0, at) + digit + str.slice(at + 1)
}

function rollRay(target, valueLength) {
  const at = 1 + Math.floor(Math.random() * Math.max(1, valueLength - 1))
  const digit = String(Math.floor(Math.random() * 10))
  return { target, at, digit }
}

const shorten = (value, keep = 26) => {
  const s = String(value)
  return s.length <= keep * 2 ? s : `${s.slice(0, keep)}…${s.slice(-keep)}`
}

// Value display. When damaged, the flipped digit burns red in place.
function Digits({ value, rogueAt }) {
  const s = String(value)
  if (rogueAt == null || rogueAt >= s.length) return <>{shorten(s)}</>
  // Keep the rogue digit visible even when the middle is elided.
  const pre = s.slice(Math.max(0, rogueAt - 12), rogueAt)
  const post = s.slice(rogueAt + 1, rogueAt + 13)
  return (
    <>
      {rogueAt > 12 ? '…' : ''}{pre}
      <span className="rogue">{s[rogueAt]}</span>
      {post}{rogueAt + 13 < s.length ? '…' : ''}
    </>
  )
}

function Machine({ n, word, tone = 'idle', innerRef, children }) {
  return (
    <div ref={innerRef} className={`machine relative w-44 shrink-0 border-2 bg-[#1c0309] shadow-[6px_6px_0_rgba(0,0,0,.55)] ${tone === 'danger' ? 'machine-hit border-[#ff2d78]' : tone === 'hot' ? 'machine-edit border-[#ffd100]' : 'border-[#ffd100]/50'}`}>
      <div className="flex items-baseline gap-2 border-b border-[#ffd100]/30 px-2 py-1">
        <span className="text-lg font-black leading-none text-[#ffd100]">{n}</span>
        <span className="text-[9px] font-bold uppercase tracking-[.22em] text-[#f4e4c1]/60">{word}</span>
        {tone === 'hot' && <span className="ml-auto text-xs">✏️</span>}
      </div>
      <div className="h-20 overflow-y-auto break-all p-2 font-mono text-[10px] leading-4 text-[#fff6dc]/85">{children}</div>
      {tone === 'danger' && <>
        <span className="smoke" style={{ left: '22%' }} />
        <span className="smoke" style={{ left: '52%', animationDelay: '.5s' }} />
        <span className="smoke" style={{ left: '76%', animationDelay: '1.1s' }} />
      </>}
    </div>
  )
}

function Belt({ reversed = false, dead = false, className = '' }) {
  return (
    <div className={`belt relative h-6 self-center overflow-hidden border-y-2 border-[#ffd100]/50 ${dead ? 'belt-dead' : ''} ${reversed ? 'belt-reverse' : ''} ${className}`}>
      <div className="belt-track absolute inset-0" />
    </div>
  )
}

// Two stars, spinning against each other. The whole button is the art.
function RayStar({ armed, onFire }) {
  const [tip, setTip] = useState(false)
  return (
    <button type="button" onClick={onFire} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
      aria-label="Fire the cosmic ray" className="ray-star relative grid h-16 w-16 place-items-center bg-transparent">
      <svg viewBox="0 0 64 64" className={`absolute inset-0 star-outer ${armed ? 'star-armed' : ''}`}>
        <polygon points="32,3 39,22 60,22 43,35 49,56 32,44 15,56 21,35 4,22 25,22" fill="none" stroke="#ffd100" strokeWidth="2.5" />
      </svg>
      <svg viewBox="0 0 64 64" className={`absolute inset-3 star-inner ${armed ? 'star-armed' : ''}`}>
        <polygon points="32,8 46,32 32,56 18,32" fill="#ffd100" opacity=".85" />
      </svg>
      {tip && <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap border border-[#ffd100]/60 bg-[#12010a] px-2 py-0.5 font-mono text-[10px] text-[#ffd100]">zap!</span>}
    </button>
  )
}

// ---------------------------------------------------------------- factory

export function InspectFactory({ message, keypair, onClose }) {
  const [draft, setDraft] = useState(message?.plaintext || 'HELLO')
  const [ray, setRay] = useState(null)         // { target: 'pack'|'lock'|'wire', at, digit }
  const [beam, setBeam] = useState(null)       // { x, y, len, angle }
  const [sealOpen, setSealOpen] = useState(false)

  const panelRef = useRef(null)
  const starRef = useRef(null)
  const blockRefs = { pack: useRef(null), lock: useRef(null), wire: useRef(null) }

  const E = BigInt(keypair.publicKey.value)
  const N = BigInt(keypair.publicKey.modulus)
  const D = BigInt(keypair.privateKey.value)
  const limit = maxBytesFor(keypair.publicKey.modulus)

  const line = useMemo(() => {
    const text = clipBytes(draft, limit)
    const m = decimalFromText(text).toString()
    const mWire = ray?.target === 'pack' ? flipDigitAt(m, Math.min(ray.at, m.length - 1), ray.digit) : m
    const cipher = modPow(BigInt(mWire), E, N).toString()
    const cipherShown = ray?.target === 'lock' ? flipDigitAt(cipher, Math.min(ray.at, cipher.length - 1), ray.digit) : cipher
    const wire = ray?.target === 'wire' ? flipDigitAt(cipherShown, Math.min(ray.at, cipherShown.length - 1), ray.digit) : cipherShown

    let recovered
    try { recovered = textFromDecimal(modPow(BigInt(wire), D, N)) } catch { recovered = '' }

    const sig = modPow(BigInt(mWire), D, N).toString()
    const sigWire = ray && ray.target !== 'pack' ? flipDigitAt(sig, Math.min(ray.at, sig.length - 1), ray.digit) : sig
    let attested
    try { attested = textFromDecimal(modPow(BigInt(sigWire), E, N)) } catch { attested = '' }

    return { text, m, mWire, cipher, cipherShown, wire, recovered, sig: sigWire, attested, ok: recovered === text, sigOk: attested === text }
  }, [draft, ray, E, N, D, limit])

  const bytesUsed = new TextEncoder().encode(draft).length
  const fuel = Math.min(1, bytesUsed / limit)

  const fire = () => {
    const target = ['pack', 'lock', 'wire'][Math.floor(Math.random() * 3)]
    const from = starRef.current?.getBoundingClientRect()
    const to = blockRefs[target].current?.getBoundingClientRect()
    const box = panelRef.current?.getBoundingClientRect()
    if (from && to && box) {
      const x1 = from.x + from.width / 2 - box.x
      const y1 = from.y + from.height / 2 - box.y
      const x2 = to.x + to.width / 2 - box.x
      const y2 = to.y + to.height / 2 - box.y
      setBeam({ x: x1, y: y1, len: Math.hypot(x2 - x1, y2 - y1), angle: Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI })
      setTimeout(() => setBeam(null), 650)
    }
    const probe = { pack: line.m, lock: line.cipher, wire: line.cipher }[target]
    setTimeout(() => setRay(rollRay(target, probe.length)), 240)
  }

  const rogue = (t, value) => (ray?.target === t ? Math.min(ray.at, String(value).length - 1) : null)
  const dripDigits = (line.cipher + line.cipher).slice(0, 120)

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/90 p-3 sm:p-8" onClick={onClose}>
      <div ref={panelRef} onClick={(e) => e.stopPropagation()} className="relative mx-auto w-fit max-w-full border-4 border-[#ffd100] bg-[#0d0107] p-4 shadow-[12px_12px_0_rgba(0,0,0,.6)] sm:p-6">

        <div className="mb-1 flex items-center justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-[#ffd100]">工厂 · cipher works</p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center border-2 border-[#ffd100]/60 text-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410]"><X size={14} /></button>
        </div>
        <p className="mb-4 font-mono text-[10px] text-[#f4e4c1]/45">🔑 E {E.toString()} · N {shorten(N.toString(), 14)}</p>

        <div className="overflow-x-auto">
          <div className="grid w-max gap-x-0 gap-y-0" style={{ gridTemplateColumns: 'auto 3.5rem auto 3.5rem auto', gridTemplateRows: 'auto 6rem auto' }}>

            {/* row 1: WRITE → PACK → LOCK */}
            <Machine n="1" word="write" tone="hot">
              <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setRay(null); setSealOpen(false) }} rows={3}
                className="w-full resize-none bg-transparent font-mono text-[11px] text-white caret-[#ffd100] outline-none" />
              <div className="mt-1 h-1 w-full bg-white/10">
                <div className={`h-full transition-all ${fuel < 0.7 ? 'bg-[#2dd4bf]' : fuel < 1 ? 'bg-[#ffd100]' : 'bg-[#ff2d78]'}`} style={{ width: `${fuel * 100}%` }} />
              </div>
            </Machine>
            <Belt dead={ray?.target === 'pack'} />
            <Machine n="2" word="pack" tone={ray?.target === 'pack' ? 'danger' : 'idle'} innerRef={blockRefs.pack}>
              <Digits value={line.mWire} rogueAt={rogue('pack', line.mWire)} />
            </Machine>
            <Belt dead={!!ray && ray.target !== 'wire'} />
            <Machine n="3" word="lock" tone={ray?.target === 'lock' ? 'danger' : 'idle'} innerRef={blockRefs.lock}>
              <Digits value={line.cipherShown} rogueAt={rogue('lock', line.cipherShown)} />
            </Machine>

            {/* row 2: star + drip channel */}
            <div className="col-span-4 grid place-items-center" ref={starRef}>
              <RayStar armed={!!ray} onFire={fire} />
            </div>
            <div className="drip relative overflow-visible">
              {Array.from({ length: 5 }).map((_, col) => (
                <span key={col} className="drip-col" style={{ left: `${12 + col * 19}%`, animationDelay: `${col * 0.45}s` }}>
                  {dripDigits.slice(col * 22, col * 22 + 22)}
                </span>
              ))}
            </div>

            {/* row 3: OPEN ← belt ← SEND */}
            <Machine n="5" word="open" tone={ray ? 'danger' : 'idle'}>
              {line.recovered || '□□□'}
            </Machine>
            <Belt reversed dead={!!ray} className="col-span-3" />
            <Machine n="4" word="send" tone={ray?.target === 'wire' ? 'danger' : 'idle'} innerRef={blockRefs.wire}>
              <Digits value={line.wire} rogueAt={rogue('wire', line.wire)} />
            </Machine>
          </div>
        </div>

        {/* wax seal — signature lives behind it */}
        <div className="relative mt-3 h-10">
          <button type="button" onClick={() => setSealOpen((o) => !o)} aria-label="Signature check"
            className={`seal absolute left-2 grid h-10 w-10 place-items-center rounded-full border-2 font-black ${line.sigOk ? 'border-[#2dd4bf] bg-[#2dd4bf]/15 text-[#2dd4bf]' : 'seal-broken border-[#ff2d78] bg-[#ff2d78]/15 text-[#ff2d78]'}`}>
            {line.sigOk ? '✓' : '!!'}
          </button>
          {sealOpen && (
            <div className="absolute bottom-12 left-0 z-20 w-72 border-2 border-[#ffd100]/60 bg-[#12010a] p-3 font-mono text-[10px] leading-5 text-[#fff6dc]/85 shadow-[8px_8px_0_rgba(0,0,0,.5)]">
              <p>s = m<sup>D</sup> mod N</p>
              <p className="break-all text-[#f4e4c1]/60"><Digits value={line.sig} rogueAt={ray && ray.target !== 'pack' ? Math.min(ray.at, line.sig.length - 1) : null} /></p>
              <p className="mt-1">s<sup>E</sup> mod N → <span className={line.sigOk ? 'text-[#2dd4bf]' : 'text-[#ff2d78]'}>{line.sigOk ? `"${line.attested}"` : '□□□'}</span></p>
            </div>
          )}
        </div>

        {/* laser overlay, above everything */}
        {beam && (
          <div className="laser pointer-events-none absolute z-30" style={{ left: beam.x, top: beam.y, width: beam.len, transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 50%' }} />
        )}
      </div>
    </div>
  )
}
