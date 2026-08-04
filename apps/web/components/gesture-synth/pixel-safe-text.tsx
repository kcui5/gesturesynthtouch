import { Fragment } from "react"

// Silkscreen's "#" glyph is an illegible blob, so render accidentals in the
// mono font where the glyph stays crisp.
export function PixelSafeText({ text }: { text: string }) {
  const parts = text.split("#")
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="font-mono font-bold">#</span>}
      {part}
    </Fragment>
  ))
}
