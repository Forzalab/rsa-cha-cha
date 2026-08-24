import { useEffect, useRef, useState } from 'react'

const GLYPHS = '0123456789'

export function CipherReveal({ text, cipher, onDone }) {
  const body = text ?? ''
  const [shown, setShown] = useState('')
  const [phase, setPhase] = useState('cipher')

  // Hold the newest callback in a ref. The parent hands us a fresh inline arrow
  // on every render, and if that identity sits in the deps array below, the
  // effect tears down and restarts — with `i` back at 0 — every single time.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })

  // onDone must fire exactly once. It calls setState upstream, so a second
  // call is a second render is a third call.
  const firedRef = useRef(false)
  useEffect(() => { firedRef.current = false }, [body])

  useEffect(() => {
    const hold = window.setTimeout(() => setPhase('reveal'), 1000)
    return () => window.clearTimeout(hold)
  }, [])

  useEffect(() => {
    if (phase !== 'reveal') return
    if (firedRef.current) { setShown(body); return }

    let i = 0
    setShown('')
    const tick = window.setInterval(() => {
      i += 1
      setShown(body.slice(0, i))
      if (i >= body.length) {
        window.clearInterval(tick)
        if (!firedRef.current) {
          firedRef.current = true
          onDoneRef.current?.()
        }
      }
    }, 28)
    return () => window.clearInterval(tick)
  }, [phase, body])

  if (phase === 'cipher') {
    const noise = (cipher || '')
      .slice(0, Math.max(24, body.length * 2))
      .replace(/\D/g, (c) => GLYPHS[Math.floor(Math.random() * 10)] ?? c)
    return <span className="cipher-text font-mono break-all opacity-70">{noise || '████████████'}</span>
  }

  return (
    <span>
      {shown}
      <span className="ml-0.5 inline-block w-2 animate-pulse bg-current align-baseline" style={{ height: '1em' }} />
    </span>
  )
}
