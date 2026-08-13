import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"

export const alt =
  "Gesture Synth Touch — a webcam gesture-controlled synthesizer"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Link-preview card drawn as the app's TFT screen: pure black, pale-cyan
// terminal text in the same VT323 face the display uses.
export default async function OpengraphImage() {
  const vt323 = await readFile(join(process.cwd(), "lib", "vt323.ttf"))

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#050a0d",
          padding: "0 96px",
          fontFamily: "VT323",
          color: "#ace6f8",
        }}
      >
        <div style={{ fontSize: 44, color: "#5e93ad" }}>&gt; NOW PLAYING</div>
        <div
          style={{ height: 5, background: "#7cc7e8", margin: "28px 0 40px" }}
        />
        <div style={{ fontSize: 110 }}>Gesture Synth Touch</div>
        <div
          style={{
            fontSize: 46,
            color: "#8ed4ef",
            marginTop: 24,
            lineHeight: 1.3,
          }}
        >
          Play chords with your hands through your webcam. Spread your
          fingers to open a window into an AI anime world.
        </div>
        <div
          style={{ height: 5, background: "#7cc7e8", margin: "40px 0 28px" }}
        />
        <div style={{ fontSize: 40, color: "#5e93ad" }}>
          no instrument · no midi · just hands
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "VT323", data: vt323, style: "normal", weight: 400 }],
    }
  )
}
