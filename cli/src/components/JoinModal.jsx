import { useEffect, useState } from 'react'
import { Check, KeyRound, LoaderCircle, RadioTower } from 'lucide-react'

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{2,20}$/

const SECURITY_CHECKS = [
  'Contacting NSA…',
  'Reaching out to CCP…',
  'Negotiating with your ISP…',
  'MI6 says it wont compile… nvm they got it working',
  'Encrypting the loading screen…',
  'Storing all your messages/IP addresses in plaintext...',
]

export function JoinModal({ connectionStatus, serverError, onJoin, onClearError, onComplete }) {
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState('form')
  const [checksVisible, setChecksVisible] = useState(0)
  const busy = connectionStatus === 'connecting' || submitting

  useEffect(() => {
    if (phase === 'loading') {
      const timers = SECURITY_CHECKS.map((_, index) =>
        window.setTimeout(() => setChecksVisible(index + 1), 495 * (index + 1)),
      )
      // one timer, not two — the old 430ms copy fired early and raced the 495ms one
      timers.push(window.setTimeout(() => setPhase('granted'), 495 * (SECURITY_CHECKS.length + 1)))
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
    setSubmitting(true)
    try {
      await onJoin(username)
      setPhase('loading')
    } catch { /* displayed by the socket hook */ }
    finally { setSubmitting(false) }
  }

  // sunburst behind the poster — pure CSS, no asset
  const rays = (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 opacity-40"
      style={{
        background:
          'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,209,0,.22) 0deg 4deg, transparent 4deg 12deg)',
        maskImage: 'radial-gradient(circle, black 20%, transparent 68%)',
        WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 68%)',
        animation: 'prop-star-spin 60s linear infinite',
      }}
    />
  )

  if (phase !== 'form') return (
    <div className={`fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#4a0410]/92 px-12 py-12 ${phase === 'exit' ? 'modal-exit' : ''}`}>
      {rays}
      <div className="relative w-full max-w-lg -rotate-[.15deg] border-[3px] border-[#ffd100] bg-[#7d0a19] p-7 shadow-[14px_14px_0_rgba(0,0,0,.55)]">
        <div className="flex items-center justify-between border-b-2 border-[#ffd100]/50 pb-4">
          <div>
            <p className="han text-[11px] text-[#ffd100]">身份审查中</p>
            <h2 className="mt-1 text-xl font-bold text-[#fff6dc]">Establishing secure vibes</h2>
          </div>
          <div className="relative grid h-11 w-11 place-items-center border-2 border-[#ffd100] text-[#ffd100]">
            <RadioTower size={19} />
            <span className="scan-square absolute inset-[-6px] border-2 border-transparent border-t-[#ffd100] border-l-[#ffd100]" />
          </div>
        </div>

        <div className="min-h-64 space-y-3 py-6 font-mono text-sm">
          {SECURITY_CHECKS.slice(0, checksVisible).map((check, index) => (
            <div key={check} className="loading-line flex items-start gap-3 text-[#fff6dc]">
              <Check size={14} className={`mt-1 shrink-0 ${index === checksVisible - 1 && phase === 'loading' ? 'text-[#ffe873]' : 'text-[#ffd100]'}`} />
              <span>{check}</span>
              <span className="han ml-auto shrink-0 whitespace-nowrap text-[10px] text-[#ffd100]">合格</span>
            </div>
          ))}
          {phase === 'granted' || phase === 'exit' ? (
            <div className="stamp-in mt-6 border-4 border-[#ffd100] bg-[#ffd100]/10 px-4 py-3 text-center">
              <span className="han block text-lg text-[#ffe873]">批准通行</span>
              <span className="block text-sm font-bold text-[#fff6dc]">CLEARANCE GRANTED (probably)</span>
            </div>
          ) : (
            <span className="inline-block h-4 w-2 animate-pulse bg-[#ffd100]" />
          )}
        </div>

        <div className="h-2 overflow-hidden border-2 border-[#ffd100]/60 bg-black/30">
          <div
            className="h-full bg-[#ffd100] transition-all duration-500"
            style={{ width: `${phase === 'granted' || phase === 'exit' ? 100 : Math.round((checksVisible / SECURITY_CHECKS.length) * 92)}%` }}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#4a0410]/88 px-12 py-12">
      {rays}
      <form onSubmit={submit} className="modal-enter relative w-full max-w-md border-[3px] border-[#ffd100] bg-[#7d0a19] p-7 shadow-[14px_14px_0_rgba(0,0,0,.55)]">
        <div className="absolute -top-4 left-6 prop-plate text-xs">第 6868 号信道</div>

        <div className="float-slow mb-5 mt-2 grid h-12 w-12 place-items-center border-2 border-[#ffd100] bg-[#ffd100]/10 text-[#ffd100]">
          <KeyRound size={23} strokeWidth={2.2} />
        </div>

        <p className="han text-[13px] text-[#ffd100]">人民加密通信频道</p>
        <h1 className="mt-1 text-4xl font-bold leading-tight text-[#f4e4c1]" style={{ textShadow: '3px 3px 0 #4a0410' }}>
          RSA CHA-CHA
        </h1>
        <p className="mt-2 text-lg font-bold text-[#ffe873]">Join the room</p>
        <div className="mt-4 h-1 bg-[#ffd100]" />

        <label className="han mt-6 block text-xs text-[#ffd100]" htmlFor="username">姓名 / DISPLAY NAME</label>
        <input
          id="username"
          autoFocus
          autoComplete="off"
          value={name}
          onChange={(event) => { setName(event.target.value); setLocalError('') }}
          placeholder="mckay"
          className="mt-2 w-full border-2 border-[#ffd100]/70 bg-[#4a0410] px-4 py-3 text-[#f4e4c1] outline-none transition placeholder:text-[#f4e4c1]/35 focus:border-[#ffd100] focus:bg-[#3a030c]"
        />
        {(localError || serverError) && <p className="mt-2 text-sm font-bold text-[#ffe873]">{localError || serverError}</p>}

        <button
          disabled={busy || connectionStatus === 'disconnected'}
          className="group mt-6 flex w-full items-center justify-center gap-2 border-2 border-[#4a0410] bg-[#ffd100] px-4 py-3 text-lg font-bold text-[#4a0410] shadow-[5px_5px_0_rgba(0,0,0,.5)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_rgba(0,0,0,.5)] active:translate-y-0.5 active:shadow-[2px_2px_0_rgba(0,0,0,.5)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <LoaderCircle className="animate-spin" size={18} />}
          {connectionStatus === 'connecting' ? 'Connecting…'
            : submitting ? 'Joining…'
            : connectionStatus === 'disconnected' ? 'Server offline'
            : 'Join chat'}
        </button>

        <p className="han mt-4 text-center text-[10px] leading-4 text-[#ffd100]/65">
          明文可耻 · 密文光荣 · 本频道全程录音录像
        </p>
      </form>
    </div>
  )
}
