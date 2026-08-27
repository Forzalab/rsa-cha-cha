import { useEffect, useMemo, useRef, useState } from 'react'
import { bowLine, permuteColumns, zalgo } from '../lib/zalgo.js'

// The room disappears for four seconds. Two palettes: the person who caused it
// sees red on white; everybody else sees gold on black and four marquees
// naming them. The asymmetry is the whole point -- the room looks at them.

const DURATION = 4000
// 2.9Hz ceiling for photosensitivity. 345ms is one full strobe period.
// Do not lower this number.
// Every swap is a re-read. At 345ms nobody finishes a word before it moves.
const PERIOD = 720

export function RitualTakeover({ name, self = false, onDone }) {
  const [words, setWords] = useState(permuteColumns)
  const [beat, setBeat] = useState(0)
  const [progress, setProgress] = useState(0)
  const doneRef = useRef(false)

  const calm = useMemo(
    () => typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    const started = Date.now()
    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      onDone?.()
    }
    const end = window.setTimeout(finish, DURATION)
    if (calm) return () => { window.clearTimeout(end); finish() }

    const tick = window.setInterval(() => {
      setWords(permuteColumns())
      setBeat((n) => n + 1)
      setProgress(Math.min(1, (Date.now() - started) / DURATION))
    }, PERIOD)
    return () => {
      window.clearTimeout(end)
      window.clearInterval(tick)
      finish()
    }
  }, [calm, onDone])

  // Corruption ramps in, then eases off in the last beat so the release reads
  // as a release and not as a crash.
  const intensity = calm ? 0 : Math.min(0.95, 0.25 + progress * 1.15) * (progress > 0.88 ? 0.35 : 1)
  const palette = self ? 'ritual--self' : 'ritual--witness'

  if (calm) {
    return (
      <div className={`ritual ${palette} ritual--calm`} role="alert">
        <div className="ritual-stack">
          {words.map((word, i) => <span className="ritual-word" key={i}>{word}</span>)}
        </div>
        <p className="ritual-caption">{self ? 'GLORY DELIVERED' : `BOW TO ${name}`}</p>
      </div>
    )
  }

  return (
    <div className={`ritual ${palette} ${beat % 2 ? 'ritual--flip' : ''}`} role="alert" aria-label="ritual takeover">
      {!self && (
        <>
          <div className="ritual-marquee ritual-marquee--top"><span>{zalgo(bowLine(name).repeat(6), intensity * 0.7)}</span></div>
          <div className="ritual-marquee ritual-marquee--bottom"><span>{zalgo(bowLine(name).repeat(6), intensity * 0.7)}</span></div>
          <div className="ritual-marquee ritual-marquee--left"><span>{zalgo(bowLine(name).repeat(6), intensity * 0.7)}</span></div>
          <div className="ritual-marquee ritual-marquee--right"><span>{zalgo(bowLine(name).repeat(6), intensity * 0.7)}</span></div>
        </>
      )}
      <div className="ritual-stack">
        {words.map((word, i) => (
          <span className="ritual-word" key={`${beat}-${i}`}>{zalgo(word, intensity)}</span>
        ))}
      </div>
    </div>
  )
}
