"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import {
  KEYS,
  WAVEFORMS,
  type KeyNote,
  type Waveform,
} from "@/lib/gesture-synth/music"

import { PixelSafeText } from "./pixel-safe-text"

const triggerClass =
  "h-10 w-48 border-2 border-(--synth-border) bg-(--synth-panel)/90 font-pixel text-sm text-(--synth-text) shadow-[3px_3px_0_rgba(0,0,0,0.5)] hover:border-(--synth-text) dark:bg-(--synth-panel)/90 dark:hover:bg-(--synth-panel) [&_svg]:text-(--synth-text)/70"

const contentClass =
  "border-2 border-(--synth-border) bg-(--synth-panel) font-pixel text-sm text-(--synth-text) ring-0"

const itemClass =
  "text-sm focus:bg-(--synth-text)/15 focus:text-(--synth-text) not-data-[variant=destructive]:focus:**:text-(--synth-text)"

type SynthControlsProps = {
  keyNote: KeyNote
  onKeyNoteChange: (note: KeyNote) => void
  waveform: Waveform
  onWaveformChange: (waveform: Waveform) => void
}

export function SynthControls({
  keyNote,
  onKeyNoteChange,
  waveform,
  onWaveformChange,
}: SynthControlsProps) {
  return (
    <div className="absolute top-4 left-4 z-5 flex flex-col gap-2.5">
      <Select
        items={KEYS.map((k) => ({
          value: k.note,
          label: <PixelSafeText text={k.label} />,
        }))}
        value={keyNote}
        onValueChange={(value) => onKeyNoteChange(value as KeyNote)}
      >
        <SelectTrigger className={triggerClass} aria-label="Key">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClass}>
          {KEYS.map((k) => (
            <SelectItem key={k.note} value={k.note} className={itemClass}>
              <PixelSafeText text={k.label} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={WAVEFORMS.map((w) => ({ value: w.value, label: w.label }))}
        value={waveform}
        onValueChange={(value) => onWaveformChange(value as Waveform)}
      >
        <SelectTrigger className={triggerClass} aria-label="Tone">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClass}>
          {WAVEFORMS.map((w) => (
            <SelectItem key={w.value} value={w.value} className={itemClass}>
              {w.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
