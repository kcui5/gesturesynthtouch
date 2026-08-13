import {
  createDecartClient,
  models,
  type RealTimeClient,
} from "@decartai/sdk"

import type { Point } from "./ascii-effect"
import { computeCoverRect } from "./canvas"

// The one live style, phrased per Decart's prompt template ("Change the
// style of the video to <description>." with concrete visual specifics —
// vague or non-template phrasing degrades output).
export const ANIME_PROMPT =
  "Change the style of the video to hand-drawn anime: clean black line " +
  "art, flat cel shading, vibrant colors, large expressive eyes."

export type LucyStatus = "off" | "connecting" | "live" | "error"

const OUTLINE_COLOR = "#3a63d6" // matches --synth-border

// After a failed connect or a dropped session, wait this long before trying
// again — the app falls back to pure ASCII in the meantime.
const RETRY_DELAY_MS = 15_000

// Realtime AI video effect (Decart Lucy 2.5). The camera MediaStream goes to
// Lucy over WebRTC; the transformed stream comes back live into a hidden
// <video>. Because the AI output is a full-frame transform of the same feed,
// drawing it screen-aligned inside the fingertip hull makes the hull a
// window into the AI world that stays registered as the hands move.
export class LucyEffect {
  private video = document.createElement("video")
  private client: RealTimeClient | null = null
  // Clone of the camera stream handed to Lucy: the SDK's LiveKit teardown
  // stops the tracks it published, which must not black out the shared feed.
  private feed: MediaStream | null = null
  private connecting = false
  // Set after a failed connect or dropped session: no retry until
  // RETRY_DELAY_MS has passed, so an outage doesn't hammer the API.
  private failedAt: number | null = null
  // Key the user pasted in, used only when the server has none of its own.
  private userKey: string | null = null
  // Whether the server can mint tokens: null until the first fetch answers,
  // false once it 503s (no DECART_API_KEY in that deployment).
  private serverConfigured: boolean | null = null

  status: LucyStatus = "off"

  constructor() {
    this.video.autoplay = true
    this.video.playsInline = true
    this.video.muted = true
  }

  // True when this deployment can't mint tokens itself, so the AI effect
  // only runs if the user supplies a key. Drives the "AI KEY" HUD row.
  get needsUserKey(): boolean {
    return this.serverConfigured === false
  }

  // Swap the user-provided key in or out. Takes effect on the next sync tick.
  setUserKey(key: string | null) {
    const next = key?.trim() || null
    if (next === this.userKey) return
    this.userKey = next
    this.failedAt = null
    // A session running on the old user key is stale: drop it and let sync
    // reconnect with the new key (or settle into ASCII if it was cleared).
    if (this.serverConfigured === false) this.disconnect()
  }

  // Reconcile the live session with the desired state. Called once per frame;
  // a cheap no-op whenever nothing changed.
  sync(stream: MediaStream | null, prompt: string) {
    if (!stream) {
      if (this.client || this.connecting) this.disconnect()
      return
    }
    if (this.connecting || this.client) return
    // No key anywhere: stay dormant (no retry churn) until one is provided.
    if (this.serverConfigured === false && !this.userKey) return
    if (
      this.failedAt !== null &&
      performance.now() - this.failedAt < RETRY_DELAY_MS
    ) {
      return
    }
    void this.connect(stream, prompt)
  }

  // Prefers a server-minted ephemeral token (deployments with their own
  // DECART_API_KEY, e.g. local dev); once the server has answered 503, falls
  // back to the user's key without re-asking.
  private async resolveApiKey(): Promise<string | null> {
    if (this.serverConfigured !== false) {
      const res = await fetch("/api/decart-token", { method: "POST" })
      if (res.ok) {
        this.serverConfigured = true
        const { apiKey } = (await res.json()) as { apiKey: string }
        return apiKey
      }
      if (res.status !== 503) {
        throw new Error(`token endpoint returned ${res.status}`)
      }
      this.serverConfigured = false
    }
    return this.userKey
  }

  private async connect(stream: MediaStream, prompt: string) {
    this.connecting = true
    this.status = "connecting"
    try {
      // Null only on the very first pass without any key: the fetch just
      // taught us serverConfigured === false, so sync stays dormant after.
      const apiKey = await this.resolveApiKey()
      if (!apiKey) {
        this.status = "off"
        return
      }

      const client = createDecartClient({ apiKey })
      this.feed = stream.clone()
      this.client = await client.realtime.connect(this.feed, {
        model: models.realtime("lucy-2.5"),
        initialState: { prompt: { text: prompt, enhance: true } },
        onRemoteStream: (remote) => {
          this.video.srcObject = remote
          this.video.play().catch(() => {})
          this.status = "live"
        },
        onConnectionChange: (state) => {
          // Dropped session: tear down and let sync reconnect after backoff.
          if (state === "disconnected" && this.client) {
            this.failedAt = performance.now()
            this.disconnect()
          }
        },
      })
      this.failedAt = null
    } catch (err) {
      console.error("Lucy connect failed:", err)
      this.failedAt = performance.now()
      this.client = null
      this.stopFeed()
      this.status = "error"
    } finally {
      this.connecting = false
    }
  }

  private stopFeed() {
    this.feed?.getTracks().forEach((track) => track.stop())
    this.feed = null
  }

  disconnect() {
    try {
      this.client?.disconnect()
    } catch {
      // already torn down
    }
    this.client = null
    this.stopFeed()
    this.video.srcObject = null
    this.status = "off"
  }

  // The AI feed once it has frames to show, for use as a sampling source.
  get liveVideo(): HTMLVideoElement | null {
    if (this.status !== "live" || this.video.readyState < 2) return null
    if (!this.video.videoWidth) return null
    return this.video
  }

  // Draws the AI stream clipped to the hull. `alpha` fades the feed (the
  // outline stays solid) so a morph can reveal it under the ASCII layer.
  // Returns false when no frame is available yet (caller falls back to the
  // ASCII effect).
  draw(
    ctx: CanvasRenderingContext2D,
    corners: Point[],
    canvasW: number,
    canvasH: number,
    opts: { alpha?: number } = {}
  ): boolean {
    if (!this.liveVideo || corners.length < 3) return false

    const quadPath = () => {
      ctx.beginPath()
      corners.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)))
      ctx.closePath()
    }

    const { sx, sy, sWidth, sHeight } = computeCoverRect(
      this.video.videoWidth,
      this.video.videoHeight,
      canvasW,
      canvasH
    )

    ctx.save()
    quadPath()
    ctx.clip()
    ctx.globalAlpha = opts.alpha ?? 1
    ctx.translate(canvasW, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(this.video, sx, sy, sWidth, sHeight, 0, 0, canvasW, canvasH)
    ctx.restore()

    quadPath()
    ctx.strokeStyle = OUTLINE_COLOR
    ctx.lineWidth = 2
    ctx.stroke()
    return true
  }

  dispose() {
    this.disconnect()
  }
}
