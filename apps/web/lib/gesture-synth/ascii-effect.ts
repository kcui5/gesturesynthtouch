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

// Dark -> bright character ramp
const RAMP = " .:-=+*#%@"
const CELL = 12 // px per character cell
const TEXT_COLOR = "#7fa5ff" // matches --synth-text
const OUTLINE_COLOR = "#3a63d6" // matches --synth-border
const BACKDROP_COLOR = "#04070d"

// Renders the video feed as ASCII art inside a quad region of the canvas
// (TouchDesigner-style). The video is downsampled to one pixel per character
// cell using the same mirrored cover crop the main canvas shows, so each
// cell samples exactly the pixels it covers.
export class AsciiEffect {
  private sample = document.createElement("canvas")
  private sctx = this.sample.getContext("2d", { willReadFrequently: true })!

  draw(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    corners: Point[],
    canvasW: number,
    canvasH: number
  ) {
    if (corners.length < 3 || !video.videoWidth || !video.videoHeight) return

    const cols = Math.ceil(canvasW / CELL)
    const rows = Math.ceil(canvasH / CELL)
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

    ctx.fillStyle = BACKDROP_COLOR
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY)

    ctx.fillStyle = TEXT_COLOR
    ctx.font = `bold ${CELL}px monospace`
    ctx.textBaseline = "top"

    const colStart = Math.max(0, Math.floor(minX / CELL))
    const colEnd = Math.min(cols, Math.ceil(maxX / CELL))
    const rowStart = Math.max(0, Math.floor(minY / CELL))
    const rowEnd = Math.min(rows, Math.ceil(maxY / CELL))

    for (let row = rowStart; row < rowEnd; row++) {
      for (let col = colStart; col < colEnd; col++) {
        const i = (row * cols + col) * 4
        const luminance =
          (0.2126 * pixels[i]! + 0.7152 * pixels[i + 1]! + 0.0722 * pixels[i + 2]!) /
          255
        const char =
          RAMP[Math.min(RAMP.length - 1, Math.floor(luminance * RAMP.length))]!
        if (char !== " ") {
          ctx.fillText(char, col * CELL, row * CELL)
        }
      }
    }
    ctx.restore()

    quadPath()
    ctx.strokeStyle = OUTLINE_COLOR
    ctx.lineWidth = 2
    ctx.stroke()
  }
}
