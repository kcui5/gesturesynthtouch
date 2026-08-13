import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

// Favicon: a tiny TFT screen with the terminal prompt, in the display font.
export default async function Icon() {
  const vt323 = await readFile(join(process.cwd(), "lib", "vt323.ttf"))

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050a0d",
          color: "#ace6f8",
          fontFamily: "VT323",
          fontSize: 26,
        }}
      >
        &gt;_
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "VT323", data: vt323, style: "normal", weight: 400 }],
    }
  )
}
