// Inspect mode. Five stations, one belt, no instructions.
//
// Rules of the room: a four-year-old should find the thing to touch without
// reading anything. So -- station 1 breathes and has a caret. The star spins.
// The tick wobbles. Everything else stays quiet until you poke it.

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { decimalFromText, textFromDecimal, signText, verifySignature, maxBytesFor } from '../lib/rsa.js'

const OVALTINE_SRC = '/ovaltine.png'
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01'

// ---------------------------------------------------------------- ad gate

export function OvaltineAd({ onSkip }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4" onClick={onSkip}>
      <div onClick={(e) => e.stopPropagation()} className="w-[min(46rem,94vw)] border-4 border-[#ffd100] bg-[#12010a] shadow-[10px_10px_0_rgba(0,0,0,.6)]">
        <p className="border-b-2 border-[#ffd100]/60 px-4 py-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#ffd100]">敖华田</p>
        <div className="grid aspect-[4/3] place-items-center bg-[#1c0309] p-3">
          {failed
            ? <div className="text-center"><p className="text-5xl">🥛</p><p className="mt-3 text-lg font-bold text-[#ffd100]">DRINK YOUR OVALTINE</p></div>
            : <img src={OVALTINE_SRC} alt="" onError={() => setFailed(true)} className="max-h-full w-full object-contain" />}
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
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center border border-[#ffd100]/60 bg-[#12010a] text-[#ffd100]"><X size={11} /></button>
      {failed
        ? <p className="text-[11px] font-bold leading-tight text-[#ffd100]">DRINK YOUR OVALTINE 🥛</p>
        : <img src={OVALTINE_SRC} alt="" onError={() => setFailed(true)} className="w-full object-contain" />}
    </div>
  )
}

// ---------------------------------------------------------------- pieces

function MatrixDrip() {
  const columns = 7
  return (
    <div className="drip pointer-events-none absolute inset-0 overflow-hidden opacity-45">
      {Array.from({ length: columns }, (_, c) => (
        <span key={c} className="drip-col" style={{ left: `${(c + 0.5) * (100 / columns)}%`, animationDelay: `${-c * 0.83}s`, animationDuration: `${3.4 + (c % 3) * 0.7}s` }}>
          {Array.from({ length: 14 }, (_, r) => GLYPHS[(c * 7 + r * 3) % GLYPHS.length]).join('\n')}
        </span>
      ))}
    </div>
  )
}

// A number with one digit on fire.
function Digits({ value, hurt = -1 }) {
  const s = String(value)
  if (hurt < 0 || hurt >= s.length) return <>{s}</>
  return <>{s.slice(0, hurt)}<span className="rogue">{s[hurt]}</span>{s.slice(hurt + 1)}</>
}

function Station({ index, tone, children, wide = false, drip = false, live = false, onClick }) {
  const skin = {
    calm: 'border-[#ffd100]/45',
    live: 'border-[#ffd100] station-breathe',
    hurt: 'border-[#ff2d78] station-alarm',
  }[tone]
  return (
    <div onClick={onClick} className={`station relative ${wide ? 'w-52' : 'w-40'} shrink-0 border-2 bg-[#1c0309] shadow-[6px_6px_0_rgba(0,0,0,.55)] ${skin}`}>
      <span className={`absolute -left-2 -top-2 z-20 grid h-6 w-6 place-items-center border-2 text-[11px] font-bold ${tone === 'hurt' ? 'border-[#ff2d78] bg-[#ff2d78] text-[#12010a]' : 'border-[#ffd100] bg-[#ffd100] text-[#4a0410]'}`}>{index}</span>
      {tone === 'hurt' && <span className="smoke" aria-hidden />}
      {drip && <MatrixDrip />}
      <div className={`relative z-10 h-28 overflow-y-auto break-all p-2 font-mono text-[11px] leading-4 ${tone === 'hurt' ? 'text-[#ffb3cd]' : 'text-[#fff6dc]/90'}`}>{children}</div>
      {live && <span className="caret" aria-hidden />}
    </div>
  )
}

function Belt({ reversed = false, dead = false }) {
  return (
    <div className={`belt relative h-6 w-10 shrink-0 self-center overflow-hidden border-y-2 border-[#ffd100]/50 ${dead ? 'belt-dead' : ''} ${reversed ? 'belt-reverse' : ''}`}>
      <div className="belt-track absolute inset-0" />
    </div>
  )
}

function RayStar({ armed, onFire }) {
  return (
    <button type="button" onClick={onFire} title={armed ? 'clear' : 'zap'} aria-label="cosmic ray"
      className="ray-btn relative grid h-16 w-16 shrink-0 place-items-center bg-transparent">
      <svg viewBox="0 0 100 100" className={`absolute inset-0 ${armed ? 'star-fast' : 'star-slow'}`}>
        <polygon points="50,4 60,40 96,50 60,60 50,96 40,60 4,50 40,40" fill={armed ? '#ff2d78' : '#ffd100'} opacity=".95" />
      </svg>
      <svg viewBox="0 0 100 100" className={`absolute inset-0 ${armed ? 'star-slow-rev' : 'star-fast-rev'}`}>
        <polygon points="50,18 57,43 82,50 57,57 50,82 43,57 18,50 43,43" fill={armed ? '#12010a' : '#4a0410'} />
      </svg>
    </button>
  )
}

const shorten = (v, keep = 26) => {
  const s = String(v)
  return s.length <= keep * 2 ? s : `${s.slice(0, keep)}…${s.slice(-keep)}`
}

function flip(decimalString) {
  const s = String(decimalString)
  if (s.length < 2) return { text: s === '0' ? '1' : '0', at: 0 }
  const at = 1 + Math.floor(Math.random() * (s.length - 1))
  const hit = (Number(s[at]) + 1 + Math.floor(Math.random() * 8)) % 10
  return { text: s.slice(0, at) + hit + s.slice(at + 1), at }
}

// ---------------------------------------------------------------- factory

export function InspectFactory({ message, keypair, onClose }) {
  const [draft, setDraft] = useState(message?.plaintext || 'HELLO')
  const [strike, setStrike] = useState(null)   // { station, at }
  const [laser, setLaser] = useState(false)
  const [showAttest, setShowAttest] = useState(false)
  const boxRef = useRef(null)

  const limit = maxBytesFor(keypair.publicKey.modulus)

  const line = useMemo(() => {
    const text = draft.slice(0, limit)
    const N = BigInt(keypair.publicKey.modulus)
    const E = BigInt(keypair.publicKey.value)
    const D = BigInt(keypair.privateKey.value)
    const powm = (b, e, m) => { let r = 1n, f = b % m, p = e; while (p > 0n) { if (p & 1n) r = r * f % m; f = f * f % m; p >>= 1n } return r }
    const hurtAt = { 2: -1, 3: -1, 4: -1 }

    // 2 -- packed integer
    let packed = decimalFromText(text)
    if (strike?.station === 2) { const f = flip(packed); packed = BigInt(f.text) % N; hurtAt[2] = f.at }
    // 3 -- cipher
    let cipher = powm(packed % N, E, N)
    if (strike?.station === 3) { const f = flip(cipher); cipher = BigInt(f.text) % N; hurtAt[3] = f.at }
    // 4 -- opened integer
    let opened = powm(cipher, D, N)
    if (strike?.station === 4) { const f = flip(opened); opened = BigInt(f.text) % N; hurtAt[4] = f.at }
    // 5 -- text back out
    let out = ''
    try { out = textFromDecimal(opened) } catch { out = '' }

    const sig = signText(text, keypair.privateKey)
    let attested = ''
    try { attested = verifySignature(sig, keypair.publicKey) } catch { attested = '' }

    return { text, packed: String(packed), cipher: String(cipher), opened: String(opened), out, hurtAt, sig, attested, ok: out === text && text.length > 0 }
  }, [draft, strike, keypair, limit])

  function fire() {
    if (strike) { setStrike(null); return }
    setLaser(true)
    setTimeout(() => setLaser(false), 700)
    setTimeout(() => setStrike({ station: 2 + Math.floor(Math.random() * 3) }), 320)
  }

  useEffect(() => { boxRef.current?.focus() }, [])

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/92 p-3 sm:p-6" onClick={onClose}>
      {laser && <span className="laser" aria-hidden />}
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-fit max-w-full border-4 border-[#ffd100] bg-[#0d0107] p-4 shadow-[12px_12px_0_rgba(0,0,0,.6)] sm:p-6">

        <div className="mb-4 flex items-start justify-between gap-6">
          <p className="font-mono text-[10px] leading-4 text-[#f4e4c1]/45">
            N {shorten(keypair.publicKey.modulus, 10)}<br />E {keypair.publicKey.value}<br />D {shorten(keypair.privateKey.value, 10)}
          </p>
          <button type="button" onClick={onClose} aria-label="close" className="grid h-7 w-7 shrink-0 place-items-center border-2 border-[#ffd100]/60 text-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410]"><X size={14} /></button>
        </div>

        <div className="flex items-stretch gap-0 overflow-x-auto pb-3 pl-2 pt-2">
          <Station index="1" tone="live" live wide>
            <textarea ref={boxRef} value={draft} onChange={(e) => { setDraft(e.target.value); setStrike(null) }}
              maxLength={limit} rows={5}
              className="h-full w-full resize-none bg-transparent font-mono text-[13px] text-white caret-[#ffd100] outline-none" />
          </Station>
          <Belt dead={!!strike} />
          <Station index="2" tone={strike?.station === 2 ? 'hurt' : 'calm'}><Digits value={shorten(line.packed)} hurt={line.hurtAt[2]} /></Station>
          <Belt dead={!!strike} />
          <Station index="3" tone={strike?.station === 3 ? 'hurt' : 'calm'}><Digits value={shorten(line.cipher)} hurt={line.hurtAt[3]} /></Station>
          <Belt reversed dead={!!strike} />
          <Station index="4" tone={strike?.station === 4 ? 'hurt' : 'calm'}><Digits value={shorten(line.opened)} hurt={line.hurtAt[4]} /></Station>
          <Belt reversed dead={!!strike} />
          <Station index="5" tone={line.ok ? 'calm' : 'hurt'} drip wide>
            <span className={line.ok ? 'text-[#fff6dc]' : 'text-[#ff2d78]'}>{line.out || '▚▚▚'}</span>
          </Station>
        </div>

        <div className="relative mt-1 flex items-center justify-center gap-6">
          <RayStar armed={!!strike} onFire={fire} />
          <button type="button" onClick={() => setShowAttest((v) => !v)} aria-label="attestation"
            className={`grid h-12 w-12 place-items-center border-2 text-2xl font-bold ${line.attested === line.text && line.text ? 'border-[#2dd4bf] bg-[#2dd4bf]/12 text-[#2dd4bf]' : 'border-[#ff2d78] bg-[#ff2d78]/12 text-[#ff2d78]'} ${showAttest ? '' : 'tick-nudge'}`}>
            {line.attested === line.text && line.text ? '✓' : '✕'}
          </button>
        </div>

        {showAttest && (
          <div className="attest-open mt-3 border-2 border-[#2dd4bf]/50 p-3 font-mono text-[10px] leading-5 text-[#fff6dc]/75">
            <p>m<sup>D</sup> mod N → {shorten(line.sig, 18)}</p>
            <p>s<sup>E</sup> mod N → {line.attested ? `"${line.attested}"` : '▚▚▚'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
