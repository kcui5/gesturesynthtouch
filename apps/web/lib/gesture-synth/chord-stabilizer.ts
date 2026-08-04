export type ChordState = {
  chord: string
  isMajorMode: boolean
  qualityIndex: number
  thumbDown: boolean
}

// Musical state: needs confidence before changing
const CHORD_HOLD_TIME_MS = 100

// Brief tracking dropouts should not silence the chord
const NULL_WINDOW_MS = 50

function sameChordState(a: ChordState | null, b: ChordState | null) {
  if (a === null && b === null) return true
  if (a === null || b === null) return false

  return (
    a.chord === b.chord &&
    a.isMajorMode === b.isMajorMode &&
    a.qualityIndex === b.qualityIndex &&
    a.thumbDown === b.thumbDown
  )
}

// Debounces the raw per-frame chord reading: a new state must hold steady for
// CHORD_HOLD_TIME_MS before it becomes the stable state, and momentary
// MediaPipe dropouts within NULL_WINDOW_MS are ignored.
export class ChordStabilizer {
  private stable: ChordState | null = null
  private candidate: ChordState | null = null
  private candidateSince = 0
  private lastSeenValidTime = 0

  update(rawState: ChordState | null, now: number): ChordState | null {
    if (rawState !== null) {
      this.lastSeenValidTime = now
    }

    let effectiveState = rawState

    if (rawState === null && now - this.lastSeenValidTime < NULL_WINDOW_MS) {
      effectiveState = this.candidate
    }

    if (!sameChordState(effectiveState, this.candidate)) {
      this.candidate = effectiveState
      this.candidateSince = now
    }

    if (now - this.candidateSince >= CHORD_HOLD_TIME_MS) {
      this.stable = this.candidate
    }

    return this.stable
  }
}
