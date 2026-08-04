"use client"

import { cn } from "@workspace/ui/lib/utils"

import { useGestureSynth } from "@/hooks/use-gesture-synth"

import { ChordReadout } from "./chord-readout"
import { HelpDialog } from "./help-dialog"
import { StartOverlay } from "./start-overlay"
import { SynthControls } from "./synth-controls"
import { VolumeMeter } from "./volume-meter"

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

        <SynthControls
          keyNote={keyNote}
          onKeyNoteChange={setKeyNote}
          waveform={waveform}
          onWaveformChange={setWaveform}
        />
        <VolumeMeter litBars={hud.litBars} filterPercent={hud.filterPercent} />
        <ChordReadout
          chordLabel={hud.chordLabel}
          qualityLabel={hud.qualityLabel}
        />
        <HelpDialog />

        {!started && <StartOverlay onStart={start} />}
      </div>
    </main>
  )
}
