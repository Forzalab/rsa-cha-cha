// Inspect mode: the RSA pipeline as a Factorio line.
//
// Top belt runs the encrypt lane, bottom belt runs it backward. Every number
// on screen is computed live from the keypair in this tab -- edit the input
// and the whole line re-runs. The star is a cosmic ray: it flips one digit
// of the cipher in transit and the bottom lane shows you what dies.
//
// Gate: the Ovaltine interstitial. Click Skip and the factory opens.

import { useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { decimalFromText, encryptText, decryptText, signText, verifySignature, maxBytesFor } from '../lib/rsa.js'

const OVALTINE_SRC = '/ovaltine.png' // drop the real asset in cli/public/

// ---------------------------------------------------------------- ad gate

export function OvaltineAd({ onSkip }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4" onClick={onSkip}>
      <div onClick={(e) => e.stopPropagation()} className="w-[min(46rem,94vw)] border-4 border-[#ffd100] bg-[#12010a] shadow-[10px_10px_0_rgba(0,0,0,.6)]">
        <p className="border-b-2 border-[#ffd100]/60 px-4 py-2 text-xs font-bold uppercase tracking-[.22em] text-[#ffd100]">
          敖华田 · A word from our sponsors
        </p>
        <div className="grid aspect-[4/3] place-items-center bg-[#1c0309] p-3">
          {failed
            ? <div className="text-center font-mono text-sm text-[#f4e4c1]/60">
                <p className="text-4xl">🥛</p>
                <p className="mt-3 text-lg font-bold text-[#ffd100]">BE SURE TO DRINK YOUR OVALTINE</p>
                <p className="mt-2 text-[11px] text-[#f4e4c1]/40">a crummy commercial? — son of a bitch</p>
                <p className="mt-4 text-[10px] text-[#f4e4c1]/30">(cli/public/ovaltine.png to replace this placeholder)</p>
              </div>
            : <img src={OVALTINE_SRC} alt="Be sure to drink your Ovaltine" onError={() => setFailed(true)} className="max-h-full w-full object-contain" />}
        </div>
        <div className="flex justify-end border-t-2 border-[#ffd100]/60 p-3">
          <button type="button" onClick={onSkip} className="border-2 border-[#4a0410] bg-[#ffd100] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#4a0410] shadow-[0_3px_0_#4a0410] transition hover:-translate-y-0.5">
            Skip ads ▶▶
          </button>
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

// ---------------------------------------------------------------- factory bits

function Belt({ reversed = false, dead = false }) {
  return (
    <div className={`belt relative h-6 min-w-10 flex-1 self-center overflow-hidden border-y-2 border-[#ffd100]/50 ${dead ? 'belt-dead' : ''} ${reversed ? 'belt-reverse' : ''}`}>
      <div className="belt-track absolute inset-0" />
    </div>
  )
}

function Machine({ label, tone = 'idle', children }) {
  const tones = {
    idle:   'border-[#ffd100]/60',
    hot:    'border-[#ffd100] shadow-[0_0_18px_rgba(255,209,0,.25)]',
    danger: 'border-[#ff2d78] shadow-[0_0_18px_rgba(255,45,120,.35)]',
  }
  return (
    <div className={`w-40 shrink-0 border-2 bg-[#1c0309] shadow-[6px_6px_0_rgba(0,0,0,.55)] ${tones[tone]}`}>
      <p className={`border-b px-2 py-1 text-[9px] font-bold uppercase tracking-[.18em] ${tone === 'danger' ? 'border-[#ff2d78]/50 text-[#ff2d78]' : 'border-[#ffd100]/40 text-[#ffd100]'}`}>{label}</p>
      <div className="max-h-24 overflow-y-auto break-all p-2 font-mono text-[10px] leading-4 text-[#fff6dc]/85">{children}</div>
    </div>
  )
}

const shorten = (value, keep = 30) => {
  const s = String(value)
  return s.length <= keep * 2 ? s : `${s.slice(0, keep)}…${s.slice(-keep)}`
}

// Flip one digit somewhere in the middle. Deterministic enough to demo,
// random enough to feel like weather.
function cosmicRay(decimalString) {
  const s = String(decimalString)
  if (s.length < 2) return s === '0' ? '1' : '0'
  const at = 1 + Math.floor(Math.random() * (s.length - 1))
  const hit = (Number(s[at]) + 1 + Math.floor(Math.random() * 8)) % 10
  return s.slice(0, at) + String(hit) + s.slice(at + 1)
}

// ---------------------------------------------------------------- factory

export function InspectFactory({ message, keypair, onClose }) {
  const [draft, setDraft] = useState(message?.plaintext ?? 'ATTACK AT DAWN')
  const [rayed, setRayed] = useState(false)

  const limit = maxBytesFor(keypair.publicKey.modulus)
  const line = useMemo(() => {
    const text = new TextEncoder().encode(draft).length > limit ? draft.slice(0, limit) : draft
    const packed = decimalFromText(text)
    const cipher = encryptText(text, keypair.publicKey)
    const wire = rayed ? cosmicRay(cipher) : cipher
    let recovered
    try { recovered = decryptText(wire, keypair.privateKey) } catch { recovered = '' }
    const signature = signText(text, keypair.privateKey)
    const sigWire = rayed ? cosmicRay(signature) : signature
    let attested
    try { attested = verifySignature(sigWire, keypair.publicKey) } catch { attested = '' }
    return { text, packed, cipher, wire, recovered, signature, sigWire, attested, ok: recovered === text, sigOk: attested === text }
  }, [draft, rayed, keypair, limit])

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/90 p-4 sm:p-8" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-fit max-w-full border-4 border-[#ffd100] bg-[#0d0107] p-4 shadow-[12px_12px_0_rgba(0,0,0,.6)] sm:p-6">

        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-[#ffd100]">工厂 · The people's cipher works</p>
          <button type="button" onClick={onClose} aria-label="Close inspect" className="grid h-7 w-7 place-items-center border-2 border-[#ffd100]/60 text-[#ffd100] hover:bg-[#ffd100] hover:text-[#4a0410]"><X size={14} /></button>
        </div>

        <p className="mb-3 font-mono text-[10px] text-[#f4e4c1]/50">
          key in use — N = {shorten(keypair.publicKey.modulus, 18)} · E = {keypair.publicKey.value} · D = {shorten(keypair.privateKey.value, 12)} · yours, this tab, real
        </p>

        {/* encrypt lane */}
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
          <Machine label="plaintext · edit me!" tone="hot">
            <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setRayed(false) }} rows={3} className="w-full resize-none bg-transparent font-mono text-[11px] text-white outline-none" />
            <p className="mt-1 text-[9px] text-[#f4e4c1]/35">≤ {limit} bytes fits one block</p>
          </Machine>
          <Belt />
          <Machine label="packed · m">{shorten(line.packed)}</Machine>
          <Belt />
          <Machine label="m^E mod N · cipher">{shorten(line.cipher)}</Machine>
        </div>

        {/* the ray */}
        <div className="relative my-1 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setRayed((r) => !r)}
            className={`flex items-center gap-2 border-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${rayed ? 'border-[#ff2d78] bg-[#ff2d78]/15 text-[#ff2d78]' : 'border-[#ffd100]/50 text-[#ffd100]/80 hover:border-[#ffd100]'}`}>
            <Sparkles size={13} className={rayed ? 'ray-spin' : ''} /> {rayed ? 'cosmic ray attack — one digit flipped in transit' : 'summon cosmic ray'}
          </button>
        </div>

        {/* decrypt lane, runs right to left */}
        <div className="flex items-stretch gap-0 overflow-x-auto pt-2">
          <Machine label={line.ok ? 'recovered ✓' : 'recovered · !!!'} tone={line.ok ? 'idle' : 'danger'}>
            {line.recovered || '∅ decode failure'}
          </Machine>
          <Belt reversed dead={!line.ok} />
          <Machine label="c^D mod N" tone={line.ok ? 'idle' : 'danger'}>{shorten(line.wire)}</Machine>
          <Belt reversed dead={!line.ok} />
          <Machine label="on the wire" tone={rayed ? 'danger' : 'idle'}>{shorten(line.wire)}</Machine>
        </div>

        {/* attestation strip */}
        <div className={`mt-4 flex flex-wrap items-center gap-3 border-2 p-2.5 ${line.sigOk ? 'border-[#2dd4bf]/50' : 'border-[#ff2d78]'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#f4e4c1]/70">认证 · attestation</p>
          <p className="font-mono text-[10px] text-[#fff6dc]/70">s = m^D mod N = {shorten(line.sigWire, 16)}</p>
          <p className="font-mono text-[10px] text-[#fff6dc]/70">s^E mod N → {line.sigOk ? `"${shorten(line.attested, 16)}"` : '∅'}</p>
          <span className={`ml-auto px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${line.sigOk ? 'bg-[#2dd4bf]/15 text-[#2dd4bf]' : 'bg-[#ff2d78]/15 text-[#ff2d78]'}`}>
            {line.sigOk ? '✓ verified — only D could have made this' : '!!! forged — does not open under E'}
          </span>
        </div>

        <p className="mt-3 text-[9px] text-[#f4e4c1]/30">every number above is live. same keypair the chat is using right now. N = {shorten(keypair.publicKey.modulus, 22)}</p>
      </div>
    </div>
  )
}
