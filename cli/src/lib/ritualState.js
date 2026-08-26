// Session-scoped singleton. Lives above React so it survives every mount and
// unmount of the factory, the ads, and the takeover. A page refresh wipes it,
// which is the correct lifetime for a demo.

const state = {
  score: 0,          // drives how far the ads have decayed
  tierHits: [],      // which glory tiers have ever been reached
  takeovers: 0,      // how many times the room has been swallowed
  subliminals: 0,    // 👁 frames spent this session (hard cap 2)
}

export const ritual = state

export function bumpScore(by = 1) { state.score += by }

export function markTier(tier) {
  if (!state.tierHits.includes(tier)) {
    state.tierHits.push(tier)
    state.score += 1
  }
}

export function markTakeover() {
  state.takeovers += 1
  state.score += 3
}

// Tier 0 warns. After the first tier it stops pretending. After a takeover it
// is openly egging you on.
export function tooltipLine() {
  if (state.takeovers > 0) return 'faster, comrade 🤫'
  if (state.tierHits.length > 0) return 'you were warned 🤫'
  return 'Type something...\nDon\'t go faster... 🤫'
}
