// Sidebar ads. Three things happen here.
//
// 1. Decay -- the creatives rot in four stages driven by ritual.score. Nobody
//    is told. A visitor who never types fast never sees stage 1.
// 2. Hydra -- dismissing one spawns two. Ignoring one spawns one. Cap 5.
//    Eight dismissals in a row clears the board and stops spawning for 30s,
//    so a demo can never be buried under its own joke.
// 3. Subliminal -- a 130ms 🥛→👁 frame, twice per session at most.

import { useEffect, useRef, useState } from 'react'
import { ritual } from '../lib/ritualState.js'
import { zalgo } from '../lib/zalgo.js'

const OVALTINE_SRC = '/ovaltine.png'

// Each creative carries its own decay. `wrong` breaks one detail; `broken`
// breaks the meaning. Stage 3 corrupts whatever stage 2 produced.
const CREATIVES = [
  { top: 'CRACKER JACK', big: 'A PRIZE IN EVERY BOX',
    small: 'some assembly required',
    wrong: 'some assembly requried',
    broken: 'A PRIZE IN EVERY BOY' },
  { top: '敖华田', big: 'DRINK YOUR OVALTINE',
    small: 'a crummy commercial',
    wrong: 'a crummy commerical',
    broken: 'DRINK YOUR OBEDIENCE' },
  { top: 'DECODER RING', big: 'BE SURE TO TURN TO B-2',
    small: 'pin included',
    wrong: 'pin incuded',
    broken: 'BE SURE TO TURN TO US' },
  { top: 'BAZOOKA JOE', big: 'FORTUNE ON THE WRAPPER',
    small: 'chew first, read later',
    wrong: 'chew first, read latre',
    broken: 'FORTUNE ON THE WATCHER' },
  { top: 'ENIGMA CO.', big: 'THREE ROTORS, ONE PRICE',
    small: 'refurbished',
    wrong: 'refurbished (mostly)',
    broken: 'THREE ROTORS, ONE VOICE' },
  { top: '素数', big: 'PRIMES, BULK RATE',
    small: 'p and q sold as a pair',
    wrong: 'p and q sold as a pear',
    broken: 'PRIMES, BULK FAITH' },
]

// score 0 is clean. The steps are deliberately far apart -- a casual visitor
// must never reach stage 2 by accident.
export function decayStage(score) {
  if (score >= 8) return 3
  if (score >= 4) return 2
  if (score >= 1) return 1
  return 0
}

function dress(creative, stage) {
  const big = stage >= 2 ? creative.broken : creative.big
  const small = stage >= 1 ? creative.wrong : creative.small
  if (stage < 3) return { ...creative, big, small }
  return {
    ...creative,
    top: zalgo(creative.top, 0.5),
    big: zalgo(big, 0.7),
    small: zalgo(small, 0.5),
  }
}

// ---------------------------------------------------------------- one card

function CrackerJackCard({ seed, stage, onDismiss }) {
  const [i, setI] = useState(seed % CREATIVES.length)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % CREATIVES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const c = dress(CREATIVES[i], stage)
  return (
    <div className={`cj-card ${stage >= 3 ? 'cj-card--rot' : ''}`}>
      <span className="cj-dots" aria-hidden="true" />
      <button type="button" onClick={onDismiss} aria-label="Close advertisement" className="cj-close">×</button>
      <span className="cj-burst" aria-hidden="true">FREE</span>
      <div key={i} className="ad-swap cj-body">
        <p className="cj-top">{c.top}</p>
        <p className="cj-big">{c.big}</p>
        <p className="cj-small">{c.small}</p>
      </div>
      {!failed && <img src={OVALTINE_SRC} alt="" onError={() => setFailed(true)} className="cj-image" />}
      <div className="cj-rail">
        {CREATIVES.map((_, n) => <span key={n} className={n === i ? 'cj-pip cj-pip--on' : 'cj-pip'} />)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- the head

let nextId = 0
const between = (low, high) => low + Math.random() * (high - low)

export function AdStack() {
  const [cards, setCards] = useState(() => [{ id: nextId++ }])
  const [subliminal, setSubliminal] = useState(false)
  const streakRef = useRef(0)
  const sleepUntilRef = useRef(0)
  const timersRef = useRef([])

  // ritual.score is a plain mutable object, so React never hears about it.
  // Poll it. Two seconds is far below the time it takes to earn a stage and
  // costs one integer compare.
  const [stage, setStage] = useState(() => decayStage(ritual.score))
  useEffect(() => {
    const id = window.setInterval(() => setStage(decayStage(ritual.score)), 2000)
    return () => window.clearInterval(id)
  }, [])

  const schedule = (fn, ms) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
  }

  useEffect(() => () => timersRef.current.forEach(window.clearTimeout), [])

  const spawn = (count) => {
    if (Date.now() < sleepUntilRef.current) return
    setCards((current) => {
      const room = Math.max(0, 5 - current.length)
      const made = Array.from({ length: Math.min(count, room) }, () => ({ id: nextId++ }))
      return [...current, ...made]
    })
  }

  // Leaving one alone still costs you one, slower. This is what makes the
  // dismissal streak a real choice rather than a free win.
  useEffect(() => {
    if (!cards.length) return
    const id = window.setTimeout(() => spawn(1), between(10000, 15000))
    return () => window.clearTimeout(id)
  }, [cards.length])

  const dismiss = (id) => {
    streakRef.current += 1
    setCards((current) => current.filter((card) => card.id !== id))

    if (streakRef.current >= 8) {
      streakRef.current = 0
      sleepUntilRef.current = Date.now() + 30000
      setCards([])
      return
    }
    schedule(() => spawn(2), between(5000, 7000))

    // The frame only ever fires once the ads have started lying.
    if (stage >= 2 && ritual.subliminals < 2) {
      ritual.subliminals += 1
      setSubliminal(true)
      schedule(() => setSubliminal(false), 130)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {cards.map((card) => (
        <CrackerJackCard key={card.id} seed={card.id} stage={stage} onDismiss={() => dismiss(card.id)} />
      ))}
      {subliminal && <div className="subliminal" aria-hidden="true">👁</div>}
    </div>
  )
}
