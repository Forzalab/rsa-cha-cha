import { useEffect, useRef, useState } from 'react'

const SEAM = 3          // characters in the fading burn-line
const HOLD_MS = 900     // how long the bubble sits as pure ciphertext first
const TOTAL_MS = 2200   // whole reveal is capped, so a long bot verdict is not a nap

export function CipherReveal({ text, cipher, onDone }) {
  const body = text ?? ''
  const digits = cipher || ''
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState('hold')

  // Parent hands down a fresh inline arrow every render. Keeping it in a ref
  // is what stops the effect from tearing down and restarting at i = 0.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })

  const firedRef = useRef(false)
  useEffect(() => { firedRef.current = false }, [body])

  useEffect(() => {
    const hold = window.setTimeout(() => setPhase('reveal'), HOLD_MS)
    return () => window.clearTimeout(hold)
  }, [])

  useEffect(() => {
    if (phase !== 'reveal') return
    if (firedRef.current) { setI(body.length); return }

    const step = Math.max(11, Math.min(30, Math.round(TOTAL_MS / Math.max(1, body.length))))
    let n = 0
    setI(0)
    const tick = window.setInterval(() => {
      n += 1
      setI(n)
      if (n >= body.length) {
        window.clearInterval(tick)
        if (!firedRef.current) {
          firedRef.current = true
          onDoneRef.current?.()
        }
      }
    }, step)
    return () => window.clearInterval(tick)
  }, [phase, body])

  // Each plaintext character eaten consumes k digits, so the rendered string
  // stays roughly the same length and the bubble does not resize mid-animation.
  const k = body.length ? digits.length / body.length : 0
  const cut = Math.min(digits.length, Math.round(i * k))

  const head = body.slice(0, i)
  const seam = digits.slice(cut, cut + SEAM)
  const tail = digits.slice(cut + SEAM)
  const done = i >= body.length

  if (done) return <span>{body}</span>

  return (
    <span>
      {head}
      {seam && <span className="cipher-seam font-mono">{seam}</span>}
      <span className="cipher-cursor" />
      {tail && <span className="cipher-text font-mono break-all">{tail}</span>}
    </span>
  )
}
