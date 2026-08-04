import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision"

export type Landmarks = NormalizedLandmark[]
export type Handedness = "Left" | "Right"

const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
const HAND_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

export async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL)
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: HAND_LANDMARKER_MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  })
}

// Landmark indices: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
const FINGERS = {
  index: { pip: 6, tip: 8 },
  middle: { pip: 10, tip: 12 },
  ring: { pip: 14, tip: 16 },
  pinky: { pip: 18, tip: 20 },
} as const

function isFingerExtended(landmarks: Landmarks, name: keyof typeof FINGERS) {
  const { pip, tip } = FINGERS[name]
  return landmarks[tip]!.y < landmarks[pip]!.y
}

export function isThumbExtended(landmarks: Landmarks, handedness: Handedness) {
  const thumbTip = landmarks[4]!
  const thumbIp = landmarks[3]!
  return handedness === "Right" ? thumbTip.x > thumbIp.x : thumbTip.x < thumbIp.x
}

function getChordQuality(landmarks: Landmarks) {
  const wrist = landmarks[0]!
  const middleMcp = landmarks[9]!
  return middleMcp.x > wrist.x ? "minor" : "major"
}

const ROMAN_BY_FINGER_COUNT: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
}

// Left hand: finger pose -> scale degree (lowercase = minor quality)
export function classifyChord(landmarks: Landmarks, handedness: Handedness) {
  const thumb = isThumbExtended(landmarks, handedness)
  const index = isFingerExtended(landmarks, "index")
  const middle = isFingerExtended(landmarks, "middle")
  const ring = isFingerExtended(landmarks, "ring")
  const pinky = isFingerExtended(landmarks, "pinky")

  const quality = getChordQuality(landmarks)

  if (index && pinky && !middle && !ring && !thumb) {
    return quality === "major" ? "VI" : "vi"
  }

  if (index && pinky && !middle && !ring && thumb) {
    return quality === "major" ? "VII" : "vii"
  }

  const count = [thumb, index, middle, ring, pinky].filter(Boolean).length
  const base = ROMAN_BY_FINGER_COUNT[count]
  if (!base) return null

  return quality === "major" ? base : base.toLowerCase()
}

// How far the wrist has slipped horizontally past the knuckle "pillars",
// with a dead zone while it stays between them. Range: -1 to 1.
export function getHandHorizontalTilt(
  landmarks: Landmarks,
  handedness: Handedness
) {
  if (!landmarks || landmarks.length < 18) return 0

  const wrist = landmarks[0]
  const middleMcp = landmarks[9]
  const ringMcp = landmarks[13]
  if (!wrist || !middleMcp || !ringMcp) return 0

  const minX = Math.min(middleMcp.x, ringMcp.x)
  const maxX = Math.max(middleMcp.x, ringMcp.x)

  // Max travel distance past the boundaries before hitting 100%
  const MAX_TRAVEL = 0.12

  let tiltFactor = 0
  if (wrist.x < minX) {
    tiltFactor = (wrist.x - minX) / MAX_TRAVEL
  } else if (wrist.x > maxX) {
    tiltFactor = (wrist.x - maxX) / MAX_TRAVEL
  }

  tiltFactor = Math.max(-1, Math.min(1, tiltFactor))

  // Mirror so "inward" tilt has the same sign for both hands
  return handedness === "Right" ? -tiltFactor : tiltFactor
}

// Right hand: wrist height -> volume (top of frame = loud)
export function getVolumeFromHeight(landmarks: Landmarks) {
  const TOP = 0.05
  const BOTTOM = 0.95

  const clamped = Math.max(TOP, Math.min(BOTTOM, landmarks[0]!.y))
  return 1 - (clamped - TOP) / (BOTTOM - TOP)
}

// Right hand: extended finger count (thumb excluded) -> voicing 1-4
export function getRightHandQualityIndex(landmarks: Landmarks) {
  return [
    isFingerExtended(landmarks, "index"),
    isFingerExtended(landmarks, "middle"),
    isFingerExtended(landmarks, "ring"),
    isFingerExtended(landmarks, "pinky"),
  ].filter(Boolean).length
}
