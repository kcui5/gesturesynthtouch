import type {
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision"

// Largest centered crop of the source video matching the destination aspect
// ratio, so the video fills the screen with zero stretch.
export function computeCoverRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
) {
  const srcRatio = srcW / srcH
  const dstRatio = dstW / dstH

  if (srcRatio > dstRatio) {
    const sHeight = srcH
    const sWidth = srcH * dstRatio
    return { sx: (srcW - sWidth) / 2, sy: 0, sWidth, sHeight }
  }

  const sWidth = srcW
  const sHeight = srcW / dstRatio
  return { sx: 0, sy: (srcH - sHeight) / 2, sWidth, sHeight }
}

// Maps a normalized landmark to canvas coordinates, accounting for the
// cover crop and the mirrored (selfie) rendering.
export function landmarkToCanvas(
  point: NormalizedLandmark,
  videoW: number,
  videoH: number,
  canvasW: number,
  canvasH: number
) {
  const { sx, sy, sWidth, sHeight } = computeCoverRect(
    videoW,
    videoH,
    canvasW,
    canvasH
  )
  const x = ((point.x * videoW - sx) / sWidth) * canvasW
  const y = ((point.y * videoH - sy) / sHeight) * canvasH
  return { x: canvasW - x, y }
}

// Mirrored camera frame with landmark dots on top
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  results: HandLandmarkerResult,
  canvasWidth: number,
  canvasHeight: number
) {
  const srcW = video.videoWidth
  const srcH = video.videoHeight
  if (!srcW || !srcH) return

  const { sx, sy, sWidth, sHeight } = computeCoverRect(
    srcW,
    srcH,
    canvasWidth,
    canvasHeight
  )

  ctx.save()
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.translate(canvasWidth, 0)
  ctx.scale(-1, 1)

  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight)

  ctx.fillStyle = "#ffffff80"
  for (const landmarks of results.landmarks) {
    for (const point of landmarks) {
      const videoPx = point.x * srcW
      const videoPy = point.y * srcH
      const canvasX = ((videoPx - sx) / sWidth) * canvasWidth
      const canvasY = ((videoPy - sy) / sHeight) * canvasHeight

      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

const SCALE_COLORS: Record<string, [number, number, number]> = {
  I: [232, 161, 61], // Tonic: golden sunset
  II: [210, 50, 120], // Purple-red
  III: [180, 40, 150], // Deep violet/magenta
  IV: [240, 210, 40], // Yellow
  V: [245, 120, 30], // Orange
  VI: [230, 40, 40], // Red
  VII: [100, 200, 250], // Cyan
}

// Flowing energy ribbon behind the chord readout.
// Line count = voicing, thickness = volume, jitter = tilt, hue = scale degree.
export function drawEnergy(
  ctx: CanvasRenderingContext2D,
  volume01: number,
  qualityIndex: number,
  tiltFactor: number,
  chordStr: string | null
) {
  if (qualityIndex === 0) return
  const lineCount = qualityIndex

  const centerY = ctx.canvas.height - 56
  const canvasWidth = ctx.canvas.width

  const maxThickness = 1 + volume01 * 8

  // Tilt (-1 to 1) -> chaos (0 to 1) driving jagged distortion
  const chaosScale = (tiltFactor + 1) / 2
  const shakinessAmp = chaosScale * 25
  const shakinessFreq = 0.05 + chaosScale * 0.15

  const isChordActive = Boolean(chordStr && chordStr !== "--")
  const isMajor = isChordActive && chordStr === chordStr!.toUpperCase()
  const [r, g, b] = isChordActive
    ? (SCALE_COLORS[chordStr!.toUpperCase()] ?? SCALE_COLORS.I!)
    : [150, 150, 150]

  // Major chords pop at full opacity; minor chords damp to a moodier state
  const brightnessAlpha = isChordActive ? (isMajor ? 1 : 0.7) : 0.3

  ctx.save()

  // Scrolls the wave left-to-right frame by frame
  const time = performance.now() * 0.004

  ctx.shadowBlur = 10 + volume01 * 20
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.5 * brightnessAlpha})`

  for (let l = 0; l < lineCount; l++) {
    ctx.beginPath()

    // Stack the line layers vertically like a wire ribbon
    const lineYOffset = centerY + (l - (lineCount - 1) / 2) * 12

    for (let x = 0; x <= canvasWidth; x += 10) {
      const baseSine = Math.sin(x * 0.005 + time + l * 0.5) * 20
      const jitter =
        (Math.random() - 0.5) * shakinessAmp * Math.sin(x * shakinessFreq + time)

      const y = lineYOffset + baseSine + jitter

      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${brightnessAlpha})`
    ctx.lineWidth = Math.max(1, maxThickness - l * 0.5)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
  }

  ctx.restore()
}
