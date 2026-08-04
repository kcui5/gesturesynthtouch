export const KEYS = [
  { note: "A", label: "A", freq: 220.0 },
  { note: "Bb", label: "A#/Bb", freq: 233.08 },
  { note: "B", label: "B", freq: 246.94 },
  { note: "C", label: "C", freq: 261.63 },
  { note: "Db", label: "C#/Db", freq: 277.18 },
  { note: "D", label: "D", freq: 293.66 },
  { note: "Eb", label: "D#/Eb", freq: 311.13 },
  { note: "E", label: "E", freq: 329.63 },
  { note: "F", label: "F", freq: 349.23 },
  { note: "Gb", label: "F#/Gb", freq: 369.99 },
  { note: "G", label: "G", freq: 392.0 },
  { note: "Ab", label: "G#/Ab", freq: 415.3 },
] as const

export type KeyNote = (typeof KEYS)[number]["note"]

export const DEFAULT_KEY = KEYS[0]

export const WAVEFORMS = [
  { value: "triangle", label: "Warm Synth" },
  { value: "sawtooth", label: "Bright Synth" },
  { value: "square", label: "Retro Synth" },
] as const

export type Waveform = (typeof WAVEFORMS)[number]["value"]

// Semitone offset of each scale degree from the tonic, in a major scale.
// This stays fixed -- what changes is which frequency counts as "0".
const DEGREE_SEMITONES: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: -1,
}

const NUMERAL_TO_DEGREE: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
}

const MAJOR_SCALE: Record<KeyNote, string[]> = {
  A: ["A", "B", "C#", "D", "E", "F#", "G#"],
  Bb: ["Bb", "C", "D", "Eb", "F", "G", "A"],
  B: ["B", "C#", "D#", "E", "F#", "G#", "A#"],
  C: ["C", "D", "E", "F", "G", "A", "B"],
  Db: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
  D: ["D", "E", "F#", "G", "A", "B", "C#"],
  Eb: ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
  E: ["E", "F#", "G#", "A", "B", "C#", "D#"],
  F: ["F", "G", "A", "Bb", "C", "D", "E"],
  Gb: ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
  G: ["G", "A", "B", "C", "D", "E", "F#"],
  Ab: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
}

export const MAJOR_QUALITY_LABELS: Record<number, string> = {
  1: "Major",
  2: "Major 1st Inv",
  3: "Major 7th",
  4: "Dominant 7th",
}

export const MINOR_QUALITY_LABELS: Record<number, string> = {
  1: "Minor",
  2: "Minor 1st Inv",
  3: "Minor 7th",
  4: "Diminished 7th",
}

function getDegreeFreq(tonicFreq: number, degree: number) {
  const semitones = DEGREE_SEMITONES[degree]!

  let tonic = tonicFreq

  // Drop the highest keys one octave so chords stay in a comfortable register
  if (tonic === 369.99 || tonic === 392.0 || tonic === 415.3) {
    tonic /= 2
  }

  return tonic * Math.pow(2, semitones / 12)
}

export function getChordName(
  keyNote: KeyNote,
  roman: string,
  isMajorMode: boolean
) {
  if (!roman || roman === "--") return ""

  const degree = NUMERAL_TO_DEGREE[roman.toUpperCase()]
  if (!degree) return ""

  const root = MAJOR_SCALE[keyNote][degree - 1]!
  return isMajorMode ? root : root + "m"
}

export type ChordTones = {
  root: number
  third: number
  fifth: number
  octaveRoot: number
  octaveThird: number
  maj7Tone: number
  dom7Tone: number
  dim7Tone: number
  dim5Tone: number
}

// All raw intervals relative to the degree root, as frequencies
export function getChordTones(
  numeralStr: string | null,
  isMajorMode: boolean,
  tonicFreq: number
): ChordTones | null {
  if (!numeralStr || numeralStr === "--") return null

  const degree = NUMERAL_TO_DEGREE[numeralStr.toUpperCase()]
  if (!degree) return null

  const root = getDegreeFreq(tonicFreq, degree)

  const thirdSemitones = isMajorMode ? 4 : 3
  const third = root * Math.pow(2, thirdSemitones / 12)
  const fifth = root * Math.pow(2, 7 / 12)

  return {
    root,
    third,
    fifth,
    octaveRoot: root * 2,
    octaveThird: third * 2,
    maj7Tone: root * Math.pow(2, 11 / 12),
    dom7Tone: root * Math.pow(2, 10 / 12),
    dim7Tone: root * Math.pow(2, 9 / 12),
    // Diminished 5th (tritone) for the minor-mode diminished 7th chord
    dim5Tone: root * Math.pow(2, 6 / 12),
  }
}

// Map the 4 right-hand finger variations depending on the left-hand mode
export function getSolidNotes(
  tones: ChordTones | null,
  rightHandCount: number,
  isMajorMode: boolean
): number[] {
  if (!tones) return []

  const {
    root,
    third,
    fifth,
    octaveRoot,
    octaveThird,
    maj7Tone,
    dom7Tone,
    dim7Tone,
    dim5Tone,
  } = tones

  if (isMajorMode) {
    switch (rightHandCount) {
      case 2: // 1st inversion
        return [third, fifth, octaveRoot, octaveThird]
      case 3: // Major 7th
        return [root, third, fifth, maj7Tone]
      case 4: // Dominant 7th
        return [root, third, fifth, dom7Tone]
      default: // Root position triad
        return [root, fifth, octaveRoot, octaveThird]
    }
  }

  switch (rightHandCount) {
    case 2: // 1st inversion
      return [third, fifth, octaveRoot, octaveThird]
    case 3: // Minor 7th
      return [root, third, fifth, dom7Tone]
    case 4: // Diminished 7th
      return [root, third, dim5Tone, dim7Tone]
    default: // Root position triad
      return [root, fifth, octaveRoot, octaveThird]
  }
}
