import { useState } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{2,20}$/

export function JoinModal({ connectionStatus, serverError, onJoin, onClearError }) {
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')
  const busy = connectionStatus === 'connecting' || connectionStatus === 'joining'

  async function submit(event) {
    event.preventDefault()
    const username = name.trim()
    if (!USERNAME_PATTERN.test(username)) {
      setLocalError('Use 2–20 letters, numbers, underscores, or dashes.')
      return
    }
    setLocalError('')
    onClearError()
    try { await onJoin(username) } catch { /* displayed by the socket hook */ }
  }

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
