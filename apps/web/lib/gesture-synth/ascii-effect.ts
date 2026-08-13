import { computeCoverRect } from "./canvas"

export type Point = { x: number; y: number }

// Convex hull (Andrew's monotone chain). Turns any set of fingertip points
// into the largest simple polygon they can corner, in drawing order.
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points

  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  const lower: Point[] = []
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
    ) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: Point[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0
    ) {
      upper.pop()
    }
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

// Shoelace area of a polygon in drawing order.
export function polygonArea(points: Point[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const q = points[(i + 1) % points.length]!
    area += p.x * q.y - q.x * p.y
  }
  return Math.abs(area / 2)
}

// Dark -> bright character ramp
const RAMP = " .:-=+*#%@"
const CELL = 12 // px per character cell
const CONTRAST = 1.8 // luminance gain around midpoint; 1 = camera as-is
const TEXT_COLOR = "#7fa5ff" // matches --synth-text
const HIGHLIGHT_COLOR = "#d6e4ff" // brightest cells pop toward white
const HIGHLIGHT_THRESHOLD = 0.7
const OUTLINE_COLOR = "#3a63d6" // matches --synth-border
const BACKDROP_COLOR = "#04070d"

// Renders a video source as ASCII art inside a quad region of the canvas
// (TouchDesigner-style). The source (camera or AI feed) is downsampled to one
// pixel per character cell using the same mirrored cover crop the main canvas
// shows, so each cell samples exactly the pixels it covers. `alpha` fades the
// glyph layer (the outline stays solid) and `cell` sets glyph size, so a
// morph can dissolve the characters into whatever is drawn beneath.
export class AsciiEffect {
  private sample = document.createElement("canvas")
  private sctx = this.sample.getContext("2d", { willReadFrequently: true })!

  draw(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    corners: Point[],
    canvasW: number,
    canvasH: number,
    opts: { alpha?: number; cell?: number } = {}
  ) {
    if (corners.length < 3 || !video.videoWidth || !video.videoHeight) return
    const alpha = opts.alpha ?? 1
    const cell = opts.cell ?? CELL

    const cols = Math.ceil(canvasW / cell)
    const rows = Math.ceil(canvasH / cell)
    if (this.sample.width !== cols || this.sample.height !== rows) {
      this.sample.width = cols
      this.sample.height = rows
    }

    const { sx, sy, sWidth, sHeight } = computeCoverRect(
      video.videoWidth,
      video.videoHeight,
      canvasW,
      canvasH
    )
    this.sctx.save()
    this.sctx.translate(cols, 0)
    this.sctx.scale(-1, 1)
    this.sctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, cols, rows)
    this.sctx.restore()
    const pixels = this.sctx.getImageData(0, 0, cols, rows).data

    // Only walk cells inside the region's bounding box
    const xs = corners.map((c) => c.x)
    const ys = corners.map((c) => c.y)
    const minX = Math.max(0, Math.min(...xs))
    const maxX = Math.min(canvasW, Math.max(...xs))
    const minY = Math.max(0, Math.min(...ys))
    const maxY = Math.min(canvasH, Math.max(...ys))
    if (maxX <= minX || maxY <= minY) return

    const quadPath = () => {
      ctx.beginPath()
      corners.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)))
      ctx.closePath()
    }

    ctx.save()
    quadPath()
    ctx.clip()
    ctx.globalAlpha = alpha

    ctx.fillStyle = BACKDROP_COLOR
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY)

    ctx.fillStyle = TEXT_COLOR
    ctx.font = `bold ${cell}px monospace`
    ctx.textBaseline = "top"

    const colStart = Math.max(0, Math.floor(minX / cell))
    const colEnd = Math.min(cols, Math.ceil(maxX / cell))
    const rowStart = Math.max(0, Math.floor(minY / cell))
    const rowEnd = Math.min(rows, Math.ceil(maxY / cell))

    const highlights: [string, number, number][] = []
    for (let row = rowStart; row < rowEnd; row++) {
      for (let col = colStart; col < colEnd; col++) {
        const i = (row * cols + col) * 4
        const raw =
          (0.2126 * pixels[i]! + 0.7152 * pixels[i + 1]! + 0.0722 * pixels[i + 2]!) /
          255
        const luminance = Math.min(1, Math.max(0, (raw - 0.5) * CONTRAST + 0.5))
        const char =
          RAMP[Math.min(RAMP.length - 1, Math.floor(luminance * RAMP.length))]!
        if (char === " ") continue
        if (luminance >= HIGHLIGHT_THRESHOLD) {
          highlights.push([char, col * cell, row * cell])
        } else {
          ctx.fillText(char, col * cell, row * cell)
        }
      }
    }
    ctx.fillStyle = HIGHLIGHT_COLOR
    for (const [char, x, y] of highlights) {
      ctx.fillText(char, x, y)
    }
    ctx.restore()

    quadPath()
    ctx.strokeStyle = OUTLINE_COLOR
    ctx.lineWidth = 2
    ctx.stroke()
  }
}
