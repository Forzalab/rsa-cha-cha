// Sidebar ads that stopped staying in the sidebar.
//
// 1. Flow    -- a fixed layer anchored bottom right. Cards fill a column
//               upward, then start a new column to the left, over the chat.
//               There is no cap you can reach by hand.
// 2. Hydra   -- dismissing one spawns two, staggered. Ignoring one spawns one.
//               Eight dismissals in a row clears the board and sleeps 30s, so
//               a demo can never be buried.
// 3. Decay   -- creatives rot in four stages driven by ritual.score.
// 4. Subliminal -- a 130ms milk-to-eye frame, twice per session at most.

import { useEffect, useRef, useState } from 'react'
import { ritual } from '../lib/ritualState.js'
import { zalgo } from '../lib/zalgo.js'

const OVALTINE_SRC = '/ovaltine.png'

// A number no hand reaches, kept only so a runaway timer cannot eat the DOM.
const HARD_CEILING = 60

// `skin` picks the palette. `wrong` breaks one detail; `broken` breaks the
// meaning. Stage 3 corrupts whatever stage 2 produced.
const CREATIVES = [
  { skin: 'jack', top: 'CRACKER JACK', big: 'A PRIZE IN EVERY BOX',
    small: 'some assembly required',
    wrong: 'some assembly requried',
    broken: 'A PRIZE IN EVERY BOY', art: true },
  { skin: 'ovaltine', top: 'Ovaltine', big: 'BOOST BRAIN POWER',
    small: 'GROW UP STRONGER',
    wrong: 'GROW UP STONGER',
    broken: 'BOOST BRAIN CONTROL', art: true },
  { skin: 'xmas', top: 'DECODER RING', big: 'Be Sure To Turn To B-2',
    small: 'pin included \u00b7 allow six weeks',
    wrong: 'pin incuded \u00b7 allow six weeks',
    broken: 'Be Sure To Turn To Us' },
  { skin: 'bazooka', top: 'BAZOOKA JOE', big: 'FORTUNE ON THE WRAPPER',
    small: 'chew first, read later',
    wrong: 'chew first, read latre',
    broken: 'FORTUNE ON THE WATCHER' },
  { skin: 'enigma', top: 'ENIGMA CO.', big: 'THREE ROTORS, ONE PRICE',
    small: 'refurbished \u00b7 ref. 1938/B',
    wrong: 'refurbished \u00b7 ref. 1938/8',
    broken: 'THREE ROTORS, ONE VOICE' },
  { skin: 'primes', top: '\u7d20\u6570', big: 'PRIMES, BULK RATE',
    small: 'p and q sold as a pair',
    wrong: 'p and q sold as a pear',
    broken: 'PRIMES, BULK FAITH' },
]

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

function AdCard({ seed, stage, onDismiss }) {
  const [i, setI] = useState(seed % CREATIVES.length)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % CREATIVES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const c = dress(CREATIVES[i], stage)
  return (
    <div className={`cj-card cj-card--${c.skin} ${stage >= 3 ? 'cj-card--rot' : ''}`}>
      <span className="cj-dots" aria-hidden="true" />
      <button type="button" onClick={onDismiss} aria-label="Close advertisement" className="cj-close">&times;</button>
      <span className="cj-burst" aria-hidden="true">FREE</span>
      <div key={i} className="ad-swap cj-body">
        <p className="cj-top">{c.top}</p>
        <p className="cj-big">{c.big}</p>
        <p className="cj-small">{c.small}</p>
      </div>
      {c.art && !failed && <img src={OVALTINE_SRC} alt="" onError={() => setFailed(true)} className="cj-image" />}
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
  const ambientRef = useRef(null)
  const timersRef = useRef([])

  // ritual.score is a plain mutable object, so React never hears it change.
  // Poll it. Two seconds is far under the time it takes to earn a stage.
  const [stage, setStage] = useState(() => decayStage(ritual.score))
  useEffect(() => {
    const id = window.setInterval(() => setStage(decayStage(ritual.score)), 2000)
    return () => window.clearInterval(id)
  }, [])

  const schedule = (fn, ms) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }

  const spawn = (count = 1) => {
    if (Date.now() < sleepUntilRef.current) return
    setCards((current) => {
      if (current.length >= HARD_CEILING) return current
      const room = Math.min(count, HARD_CEILING - current.length)
      return [...current, ...Array.from({ length: room }, () => ({ id: nextId++ }))]
    })
  }

  // One ambient clock for the whole board. A per-card timer restarted itself
  // on every length change, which is what put two cards in the same frame.
  const armAmbient = (extra = 0) => {
    window.clearTimeout(ambientRef.current)
    ambientRef.current = window.setTimeout(() => {
      spawn(1)
      armAmbient()
    }, between(10000, 15000) + extra)
  }

  useEffect(() => {
    armAmbient()
    return () => {
      window.clearTimeout(ambientRef.current)
      timersRef.current.forEach(window.clearTimeout)
    }
  }, [])

  const dismiss = (id) => {
    streakRef.current += 1
    setCards((current) => current.filter((card) => card.id !== id))

    // A card leaving and a card arriving in the same frame reads as a glitch.
    // Push the ambient spawn clear of the exit.
    armAmbient(900)

    if (streakRef.current >= 8) {
      streakRef.current = 0
      sleepUntilRef.current = Date.now() + 30000
      window.clearTimeout(ambientRef.current)
      schedule(() => armAmbient(), 30000)
      setCards([])
      return
    }

    // Two heads, never on the same tick.
    schedule(() => spawn(1), between(5000, 7000))
    schedule(() => spawn(1), between(5400, 7400))

    if (stage >= 2 && ritual.subliminals < 2) {
      ritual.subliminals += 1
      setSubliminal(true)
      schedule(() => setSubliminal(false), 130)
    }
  }

  return (
    <>
      <div className="ad-swarm" aria-label="advertisements">
        {cards.map((card) => (
          <AdCard key={card.id} seed={card.id} stage={stage} onDismiss={() => dismiss(card.id)} />
        ))}
      </div>
      {subliminal && <div className="subliminal" aria-hidden="true">&#128065;</div>}
    </>
  )
}
