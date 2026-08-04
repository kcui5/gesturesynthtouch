import { PixelSafeText } from "./pixel-safe-text"

type ChordReadoutProps = {
  chordLabel: string
  qualityLabel: string
}

export function ChordReadout({ chordLabel, qualityLabel }: ChordReadoutProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-5 flex -translate-x-1/2 flex-col items-center gap-2 text-center">
      <div className="font-pixel text-2xl font-bold text-(--synth-text) [text-shadow:0_0_14px_rgba(127,165,255,0.65)]">
        <PixelSafeText text={chordLabel} />
      </div>
      <div className="font-pixel text-sm text-(--synth-text)/80">
        {qualityLabel}
      </div>
    </div>
  )
}
