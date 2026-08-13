"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  AsciiEffect,
  convexHull,
  polygonArea,
} from "@/lib/gesture-synth/ascii-effect"
import {
  drawEnergy,
  drawVideoFrame,
  landmarkToCanvas,
} from "@/lib/gesture-synth/canvas"
import {
  ChordStabilizer,
  type ChordState,
} from "@/lib/gesture-synth/chord-stabilizer"
import {
  classifyChord,
  createHandLandmarker,
  getExtendedFingerTips,
  getHandHorizontalTilt,
  getRightHandQualityIndex,
  getVolumeFromHeight,
  isThumbExtended,
  type Landmarks,
} from "@/lib/gesture-synth/hand-tracking"
import {
  DEFAULT_KEY,
  KEYS,
  MAJOR_QUALITY_LABELS,
  MINOR_QUALITY_LABELS,
  getChordName,
  getChordTones,
  getSolidNotes,
  type KeyNote,
  type Waveform,
} from "@/lib/gesture-synth/music"
import { ANIME_PROMPT, LucyEffect } from "@/lib/gesture-synth/lucy-effect"
import { SynthEngine } from "@/lib/gesture-synth/synth-engine"

export const VOLUME_BAR_COUNT = 8

// localStorage slot for a user-provided Decart key, used on deployments
// where the server has no DECART_API_KEY of its own.
const AI_KEY_STORAGE = "gesture-synth-decart-key"

// Hull area (as a fraction of the canvas) mapped onto the ASCII -> AI morph:
// a small fingertip window is pure ASCII, spreading the hands develops it
// into the raw AI feed. A relaxed two-hand hull sits around 10-25% of the
// canvas, so full anime takes a deliberate wide spread.
const MORPH_AREA_MIN = 0.1
const MORPH_AREA_MAX = 0.45
// Glyph size shrinks as the morph advances, so the characters dissolve into
// the image instead of just fading.
const MORPH_CELL_MAX = 12
const MORPH_CELL_MIN = 7

export type SynthHud = {
  chordLabel: string
  qualityLabel: string
  litBars: number
  filterPercent: number
}

const INITIAL_HUD: SynthHud = {
  chordLabel: "--",
  qualityLabel: "--",
  litBars: 0,
  filterPercent: 0,
}

export function useGestureSynth() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const synthRef = useRef<SynthEngine | null>(null)
  if (synthRef.current == null) {
    synthRef.current = new SynthEngine()
  }

  // Settings are read inside the animation loop via this ref so changing
  // them never restarts the camera/landmarker pipeline.
  const settingsRef = useRef({
    tonicFreq: DEFAULT_KEY.freq as number,
    keyNote: DEFAULT_KEY.note as KeyNote,
    waveform: "triangle" as Waveform,
  })

  const [started, setStarted] = useState(false)
  const [keyNote, setKeyNoteState] = useState<KeyNote>(DEFAULT_KEY.note)
  const [waveform, setWaveformState] = useState<Waveform>("triangle")
  const [hud, setHud] = useState<SynthHud>(INITIAL_HUD)

  // AI-key fallback: true once the token endpoint reports the server has no
  // key, which reveals the "AI KEY" row on the HUD.
  const lucyRef = useRef<LucyEffect | null>(null)
  const [aiKeyNeeded, setAiKeyNeeded] = useState(false)
  // Hydration-safe despite the storage read: the key is only rendered
  // inside the AI row, which never shows on the first paint.
  const [aiKey, setAiKeyState] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem(AI_KEY_STORAGE) ?? "")
  )

  const setAiKey = useCallback((key: string) => {
    const trimmed = key.trim()
    setAiKeyState(trimmed)
    if (trimmed) localStorage.setItem(AI_KEY_STORAGE, trimmed)
    else localStorage.removeItem(AI_KEY_STORAGE)
    lucyRef.current?.setUserKey(trimmed || null)
  }, [])

  // Read inside the animation loop: the Lucy session (billed per streamed
  // minute) must not connect until the user actually starts the synth.
  const startedRef = useRef(false)

  const start = useCallback(() => {
    // Audio contexts must be created from a user gesture
    synthRef.current!.ensureContext()
    startedRef.current = true
    setStarted(true)
  }, [])

  const setKeyNote = useCallback((note: KeyNote) => {
    const key = KEYS.find((k) => k.note === note)
    if (!key) return
    settingsRef.current.tonicFreq = key.freq
    settingsRef.current.keyNote = key.note
    setKeyNoteState(key.note)
  }, [])

  const setWaveform = useCallback((wave: Waveform) => {
    settingsRef.current.waveform = wave
    synthRef.current!.currentKey = null // force the oscillators to rebuild
    setWaveformState(wave)
  }, [])


  useEffect(() => {
    const videoEl = videoRef.current
    const canvasEl = canvasRef.current
    if (!videoEl || !canvasEl) return

    const ctx = canvasEl.getContext("2d")
    if (!ctx) return

    const synth = synthRef.current!
    const stabilizer = new ChordStabilizer()
    const asciiEffect = new AsciiEffect()
    const lucyEffect = new LucyEffect()
    lucyEffect.setUserKey(localStorage.getItem(AI_KEY_STORAGE))
    lucyRef.current = lucyEffect

    let disposed = false
    let rafId = 0
    let stream: MediaStream | null = null
    let handLandmarker: Awaited<ReturnType<typeof createHandLandmarker>> | null =
      null

    function resizeCanvas() {
      // The canvas sits inset within the pixel frame, so size the backing
      // store to its own box rather than the window.
      const rect = canvasEl!.getBoundingClientRect()
      canvasEl!.width = rect.width
      canvasEl!.height = rect.height
    }

    async function setupCamera() {
      // 640x480 like the original prototype: MediaPipe hand tracking is the
      // latency-critical consumer, and the smaller frames keep it smooth
      // alongside Lucy's WebRTC encode. Lucy upscales its input itself.
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      videoEl!.srcObject = stream
      await new Promise<void>((resolve) => {
        videoEl!.onloadedmetadata = () => {
          videoEl!.play()
          resolve()
        }
      })
    }

    async function run() {
      await setupCamera()
      if (disposed) return

      resizeCanvas()
      window.addEventListener("resize", resizeCanvas)

      handLandmarker = await createHandLandmarker()
      if (disposed) return

      let lastVideoTime = -1

      // Landmarks persist across ticks between MediaPipe results
      let leftHand: Landmarks | null = null
      let rightHand: Landmarks | null = null

      // Smoothed ASCII -> AI morph position (0..1), driven by hull area
      let morph = 0

      function loop() {
        const now = performance.now()
        const settings = settingsRef.current

        // 0. Keep the Lucy session alive (reconnecting after failures with
        // backoff) so the AI world is already streaming when the fingertip
        // hull appears. Gated on start so no billed streaming happens while
        // the page just sits on the overlay. If the server has no key, sync
        // keeps failing quietly and the app stays pure ASCII.
        lucyEffect.sync(startedRef.current ? stream : null, ANIME_PROMPT)

        // 1. Pull a fresh MediaPipe result when the video advances
        if (videoEl!.currentTime !== lastVideoTime) {
          lastVideoTime = videoEl!.currentTime

          const results = handLandmarker!.detectForVideo(videoEl!, now)
          drawVideoFrame(ctx!, videoEl!, results, canvasEl!.width, canvasEl!.height)

          leftHand = null
          rightHand = null
          results.landmarks.forEach((landmarks, i) => {
            const handedness = results.handedness[i]?.[0]?.categoryName
            if (handedness === "Left") leftHand = landmarks
            if (handedness === "Right") rightHand = landmarks
          })

          // TouchDesigner-style effect region: every extended fingertip is a
          // candidate corner, and their convex hull (the best polygon the
          // active fingers can form) becomes a window into the effect. With
          // an AI style live, hull area morphs the window from ASCII (small)
          // to the raw AI feed (hands spread wide): the glyphs sample the AI
          // world, shrink, and dissolve into it.
          const lh: Landmarks | null = leftHand
          const rh: Landmarks | null = rightHand
          const tips = [
            ...(lh ? getExtendedFingerTips(lh, "Left") : []),
            ...(rh ? getExtendedFingerTips(rh, "Right") : []),
          ]
          if (tips.length >= 3) {
            const corners = convexHull(
              tips.map((p) =>
                landmarkToCanvas(
                  p,
                  videoEl!.videoWidth,
                  videoEl!.videoHeight,
                  canvasEl!.width,
                  canvasEl!.height
                )
              )
            )
            const canvasW = canvasEl!.width
            const canvasH = canvasEl!.height
            const aiVideo = lucyEffect.liveVideo

            const areaFrac = polygonArea(corners) / (canvasW * canvasH)
            const t = aiVideo
              ? Math.min(
                  1,
                  Math.max(
                    0,
                    (areaFrac - MORPH_AREA_MIN) /
                      (MORPH_AREA_MAX - MORPH_AREA_MIN)
                  )
                )
              : 0
            // Smoothstep for soft ends, then ease toward the target so the
            // transition glides instead of tracking area jitter.
            const target = t * t * (3 - 2 * t)
            morph += (target - morph) * 0.15
            if (morph < 0.005) morph = 0

            if (aiVideo && morph > 0.01) {
              lucyEffect.draw(ctx!, corners, canvasW, canvasH, { alpha: morph })
            }
            if (morph < 0.99) {
              asciiEffect.draw(ctx!, aiVideo ?? videoEl!, corners, canvasW, canvasH, {
                alpha: 1 - morph,
                cell: Math.round(
                  MORPH_CELL_MAX - morph * (MORPH_CELL_MAX - MORPH_CELL_MIN)
                ),
              })
            }
          }
        }

        // 2. Raw gesture state: left hand picks the chord, right hand voices it
        let rawState: ChordState | null = null

        if (leftHand) {
          const chord = classifyChord(leftHand, "Left")
          if (chord) {
            rawState = {
              chord,
              isMajorMode: getHandHorizontalTilt(leftHand, "Left") >= 0,
              qualityIndex: rightHand ? getRightHandQualityIndex(rightHand) : 0,
              thumbDown: rightHand ? isThumbExtended(rightHand, "Right") : false,
            }
          }
        }

        // 3. Debounce
        const stable = stabilizer.update(rawState, now)
        const currentChord = stable?.chord ?? null
        const isMajorMode = stable?.isMajorMode ?? true
        const qualityIndex = stable?.qualityIndex ?? 0
        const thumbDown = stable?.thumbDown ?? false

        // 4. Audio
        let volume = 0
        let tilt = 0

        if (rightHand) {
          volume = getVolumeFromHeight(rightHand)
          tilt = getHandHorizontalTilt(rightHand, "Right")

          synth.updateFilterSweep(tilt)

          if (currentChord && qualityIndex >= 1) {
            const tones = getChordTones(currentChord, isMajorMode, settings.tonicFreq)
            let notes = getSolidNotes(tones, qualityIndex, isMajorMode)
            if (thumbDown) {
              notes = notes.map((freq) => freq / 2)
            }
            synth.playNotes(notes, settings.waveform)
            synth.setVolume(volume)
          } else {
            synth.setVolume(0)
          }
        } else {
          synth.setVolume(0)
        }

        // 5. HUD (bail out of the re-render when nothing changed)
        const activeLabel = isMajorMode
          ? MAJOR_QUALITY_LABELS[qualityIndex]
          : MINOR_QUALITY_LABELS[qualityIndex]

        const hasRightHand = rightHand !== null

        setHud((prev) => {
          const next: SynthHud = {
            // The last chord stays on screen, like the original
            chordLabel: currentChord
              ? `${getChordName(settings.keyNote, currentChord, isMajorMode)}(${currentChord})`
              : prev.chordLabel,
            qualityLabel: activeLabel
              ? `${activeLabel}${thumbDown ? " (-8ve)" : ""}`
              : "--",
            litBars: hasRightHand
              ? Math.round(volume * VOLUME_BAR_COUNT)
              : prev.litBars,
            filterPercent: hasRightHand
              ? Math.round(tilt * 100)
              : prev.filterPercent,
          }

          const unchanged =
            next.chordLabel === prev.chordLabel &&
            next.qualityLabel === prev.qualityLabel &&
            next.litBars === prev.litBars &&
            next.filterPercent === prev.filterPercent

          return unchanged ? prev : next
        })
        setAiKeyNeeded(lucyEffect.needsUserKey)

        // 6. Energy ribbon
        drawEnergy(ctx!, volume, qualityIndex, tilt, currentChord)

        rafId = requestAnimationFrame(loop)
      }

      loop()
    }

    run().catch((err) => console.error(err))

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resizeCanvas)
      stream?.getTracks().forEach((track) => track.stop())
      handLandmarker?.close()
      lucyRef.current = null
      lucyEffect.dispose()
      synth.dispose()
    }
  }, [])

  return {
    videoRef,
    canvasRef,
    started,
    start,
    hud,
    keyNote,
    setKeyNote,
    waveform,
    setWaveform,
    aiKeyNeeded,
    aiKey,
    setAiKey,
  }
}
