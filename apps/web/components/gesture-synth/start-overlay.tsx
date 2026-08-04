"use client"

type StartOverlayProps = {
  onStart: () => void
}

export function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-end gap-6 bg-black/55 pb-[15vh]"
    >
      <span className="flex size-20 items-center justify-center border-2 border-(--synth-border) bg-(--synth-panel)/90 text-3xl text-(--synth-text) shadow-[4px_4px_0_rgba(0,0,0,0.6)]">
        ▶
      </span>
      <span className="pixel-blink font-pixel text-base tracking-wider text-white">
        CLICK TO ENABLE AUDIO
      </span>
    </button>
  )
}
