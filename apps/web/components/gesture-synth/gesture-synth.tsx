"use client"

import { cn } from "@workspace/ui/lib/utils"

import { useGestureSynth } from "@/hooks/use-gesture-synth"

import { BreadboardPanel } from "./breadboard-panel"
import { ChordReadout } from "./chord-readout"
import { StartOverlay } from "./start-overlay"

import "@/app/gesture-synth.css"

export function GestureSynth() {
  const {
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
  } = useGestureSynth()

  return (
    <main className="synth-frame fixed inset-0 h-dvh w-screen overflow-hidden p-4">
      {/* Pixel frame: the camera view sits inset behind a chunky rounded border */}
      <div className="relative h-full w-full overflow-hidden rounded-lg border-3 border-(--synth-border) bg-black shadow-[0_0_0_2px_rgba(58,99,214,0.25)]">
        <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 h-full w-full",
            !started && "brightness-60 grayscale"
          )}
        />

        <BreadboardPanel
          keyNote={keyNote}
          onKeyNoteChange={setKeyNote}
          waveform={waveform}
          onWaveformChange={setWaveform}
          litBars={hud.litBars}
          filterPercent={hud.filterPercent}
          aiKeyNeeded={aiKeyNeeded}
          aiKey={aiKey}
          onAiKeyChange={setAiKey}
        />
        <ChordReadout
          chordLabel={hud.chordLabel}
          qualityLabel={hud.qualityLabel}
        />

        {!started && <StartOverlay onStart={start} />}
      </div>
    </main>
  )
}
