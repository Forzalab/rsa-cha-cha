import { useEffect, useState } from 'react'

const GLYPHS = '0123456789'

export function CipherReveal({ text, cipher, onDone }) {
  const [shown, setShown] = useState('')
  const [phase, setPhase] = useState('cipher')

  useEffect(() => {
    const hold = window.setTimeout(() => setPhase('reveal'), 1000)
    return () => window.clearTimeout(hold)
  }, [])

  useEffect(() => {
    if (phase !== 'reveal') return
    let i = 0
    const tick = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(tick)
        onDone?.()
      }
    }, 28)
    return () => window.clearInterval(tick)
  }, [phase, text, onDone])

  if (phase === 'cipher') {
    const noise = (cipher || '')
      .slice(0, Math.max(24, text.length * 2))
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
