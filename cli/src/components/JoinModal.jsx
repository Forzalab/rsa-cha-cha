import { useEffect, useState } from 'react'
import { Check, KeyRound, LoaderCircle, RadioTower } from 'lucide-react'

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{2,20}$/

const SECURITY_CHECKS = [
  'Contacting NSA…',
  'Reaching out to CCP…',
  'Negotiating with your ISP…',
  'Asking Bruce if it compiles…',
  'Encrypting the loading screen…',
  'Deleting absolutely nothing…',
]

export function JoinModal({ connectionStatus, serverError, onJoin, onClearError, onComplete }) {
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')
  const [phase, setPhase] = useState('form')
  const [checksVisible, setChecksVisible] = useState(0)
  const busy = connectionStatus === 'connecting' || connectionStatus === 'joining'

  useEffect(() => {
    if (phase === 'loading') {
      const timers = SECURITY_CHECKS.map((_, index) => window.setTimeout(() => setChecksVisible(index + 1), 430 * (index + 1)))
      timers.push(window.setTimeout(() => setPhase('granted'), 430 * (SECURITY_CHECKS.length + 1)))
      return () => timers.forEach(window.clearTimeout)
    }
    if (phase === 'granted') {
      const timer = window.setTimeout(() => setPhase('exit'), 850)
      return () => window.clearTimeout(timer)
    }
    if (phase === 'exit') {
      const timer = window.setTimeout(onComplete, 650)
      return () => window.clearTimeout(timer)
    }
  }, [onComplete, phase])

  async function submit(event) {
    event.preventDefault()
    const username = name.trim()
    if (!USERNAME_PATTERN.test(username)) {
      setLocalError('Use 2–20 letters, numbers, underscores, or dashes.')
      return
    }
    setLocalError('')
    onClearError()
    try {
      await onJoin(username)
      setPhase('loading')
    } catch { /* displayed by the socket hook */ }
  }

  if (phase !== 'form') return (
    <div className={`fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#05070c]/90 px-5 backdrop-blur-xl ${phase === 'exit' ? 'modal-exit' : ''}`}>
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-300/15 bg-[#0b111c]/95 p-7 shadow-2xl shadow-black/60">
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
        <div className="flex items-center justify-between border-b border-white/8 pb-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-emerald-300">Identity clearance</p><h2 className="mt-1 text-xl font-semibold text-white">Establishing secure vibes</h2></div>
          <div className="relative grid h-11 w-11 place-items-center rounded-full border border-emerald-300/15 text-emerald-300"><RadioTower size={19} /><span className="loading-orbit absolute inset-[-4px] rounded-full border border-transparent border-t-emerald-300/70" /></div>
        </div>
        <div className="min-h-64 space-y-3 py-6 font-mono text-sm">
          {SECURITY_CHECKS.slice(0, checksVisible).map((check, index) => <div key={check} className="loading-line flex items-center gap-3 text-slate-400"><Check size={14} className={index === checksVisible - 1 && phase === 'loading' ? 'text-amber-300' : 'text-emerald-400'} /><span>{check}</span><span className="ml-auto text-[10px] text-slate-700">OK</span></div>)}
          {phase === 'granted' || phase === 'exit' ? <div className="loading-line mt-6 rounded-xl border border-emerald-300/20 bg-emerald-400/8 px-4 py-3 text-center font-sans text-sm font-semibold tracking-wide text-emerald-300">CLEARANCE GRANTED (probably)</div> : <span className="inline-block h-4 w-2 animate-pulse bg-emerald-300/70" />}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-500" style={{ width: `${phase === 'granted' || phase === 'exit' ? 100 : Math.round((checksVisible / SECURITY_CHECKS.length) * 92)}%` }} /></div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#05070c]/80 px-5 backdrop-blur-xl">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      <form onSubmit={submit} className="modal-enter relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#10151f]/95 p-7 shadow-2xl shadow-emerald-950/40">
        <div className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />
        <div className="float-slow mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300 shadow-lg shadow-emerald-500/10">
          <KeyRound size={23} strokeWidth={1.8} />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.22em] text-emerald-300">RSA Cha-Cha</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Join the room</h1>
        <p className="mt-3 leading-6 text-slate-400">Choose a display name for this session. No account or password needed.</p>

        <label className="mt-7 block text-sm font-medium text-slate-200" htmlFor="username">Display name</label>
        <input
          id="username"
          autoFocus
          autoComplete="off"
          value={name}
          onChange={(event) => { setName(event.target.value); setLocalError('') }}
          placeholder="mckay"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
        />
        {(localError || serverError) && <p className="mt-2 text-sm text-rose-400">{localError || serverError}</p>}

        <button disabled={busy || connectionStatus === 'disconnected'} className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-3 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-emerald-400/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50">
          {busy && <LoaderCircle className="animate-spin" size={18} />}
          {connectionStatus === 'connecting' ? 'Connecting…' : connectionStatus === 'joining' ? 'Joining…' : connectionStatus === 'disconnected' ? 'Server offline' : 'Join chat'}
        </button>
      </form>
    </div>
  )
}
