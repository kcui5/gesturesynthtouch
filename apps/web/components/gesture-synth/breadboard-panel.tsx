"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { VOLUME_BAR_COUNT } from "@/hooks/use-gesture-synth"
import {
  KEYS,
  WAVEFORMS,
  type KeyNote,
  type Waveform,
} from "@/lib/gesture-synth/music"

import { AiKeyDialog } from "./ai-key-dialog"
import { HelpDialog } from "./help-dialog"

// LCD palette, matched to a pale-cyan TFT readout on black.
const lcdText = "text-[#ace6f8]"
const lcdDim = "text-[#5e93ad]"

const screenTriggerClass =
  "h-auto w-auto justify-end gap-1 border-0 bg-transparent p-0 font-lcd text-[20px] leading-none text-[#ace6f8] shadow-none ring-0 data-[size=default]:h-auto hover:bg-transparent hover:text-white dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3 [&_svg]:text-[#ace6f8]/60"

const screenContentClass =
  "border-2 border-[#7cc7e8]/70 bg-[#04141d] font-lcd text-[20px] leading-none text-[#ace6f8] ring-0 [text-shadow:0.5px_0_0_currentColor]"

const screenItemClass =
  "py-1.5 text-[20px] leading-none focus:bg-[#ace6f8]/15 focus:text-[#ace6f8] not-data-[variant=destructive]:focus:**:text-[#ace6f8]"

// Negative margins pull the neighboring rows in past the container gap, so
// dividers sit tighter to the text than rows do to each other.
function ScreenDivider() {
  return <div className="-my-[3px] h-[2px] w-full bg-[#7cc7e8]" />
}

// Jumper wires running from the display module's pin header off the screen
// edge. Drawn in container coordinates; the frame's overflow-hidden crops
// them at the viewport edge so they read as running out of the scene.
function Wires() {
  const wires = [
    { d: "M 56 142 C 0 136, -30 154, -80 148", color: "#e6c822" },
    { d: "M 56 156 C -6 162, -30 194, -85 204", color: "#3050d8" },
    { d: "M 56 170 C -8 184, -36 234, -75 269", color: "#7a4fd8" },
    { d: "M 56 184 C -10 204, -30 284, -60 334", color: "#16181d" },
  ]
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[15] overflow-visible"
      aria-hidden
    >
      {wires.map((w) => (
        <g key={w.d}>
          <path
            d={w.d}
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={7}
            strokeLinecap="round"
            transform="translate(1.5 2.5)"
          />
          <path
            d={w.d}
            fill="none"
            stroke={w.color}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  )
}

// Circular mount holes cut straight through the PCB strips (CSS mask), so
// whatever sits behind the module — breadboard or camera — shows through,
// like the drilled holes on a real display board.
const STRIP_HOLE_MASK =
  "radial-gradient(circle at 12px 16px, transparent 0 5.5px, black 6px), " +
  "radial-gradient(circle at 12px calc(100% - 16px), transparent 0 5.5px, black 6px)"

const stripMaskStyle: React.CSSProperties = {
  maskImage: STRIP_HOLE_MASK,
  maskComposite: "intersect",
  WebkitMaskImage: STRIP_HOLE_MASK,
  WebkitMaskComposite: "source-in",
}

type BreadboardPanelProps = {
  keyNote: KeyNote
  onKeyNoteChange: (note: KeyNote) => void
  waveform: Waveform
  onWaveformChange: (waveform: Waveform) => void
  litBars: number
  filterPercent: number
  // Shown when the deployment has no server-side Decart key, so the user
  // can optionally supply their own.
  aiKeyNeeded: boolean
  aiKey: string
  onAiKeyChange: (key: string) => void
}

export function BreadboardPanel({
  keyNote,
  onKeyNoteChange,
  waveform,
  onWaveformChange,
  litBars,
  filterPercent,
  aiKeyNeeded,
  aiKey,
  onAiKeyChange,
}: BreadboardPanelProps) {
  const volumeFraction = litBars / VOLUME_BAR_COUNT

  return (
    <div className="absolute -top-5 -left-6 z-5 h-[330px] w-[300px]">
      {/* Breadboard: classic white body with a dark tie-point hole grid. The
          display module overhangs its right edge. */}
      <div className="absolute top-0 left-0 h-[330px] w-[240px] rounded-sm bg-[#ece9e2] shadow-[6px_6px_0_rgba(0,0,0,0.45)]">
        <div className="absolute top-[18px] right-[42px] bottom-[30px] left-[46px] bg-[radial-gradient(circle,#6f6b62_1.4px,transparent_1.6px)] bg-[size:12px_12px] bg-position-[6px_6px]" />
        {/* Vertical power rail strips: blue/red lines flanking a hole column
            (grouped in fives, like the real thing), +/- at the bottom ends */}
        <div className="absolute top-2 bottom-[24px] left-[16px] w-[2px] bg-[#3a63d6]/70" />
        <div className="absolute top-2 bottom-[24px] left-[34px] w-[2px] bg-[#d24040]/70" />
        <div
          className="absolute top-2 bottom-[24px] left-[21px] w-[10px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 60px, #ece9e2 60px 72px), radial-gradient(circle, #6f6b62 1.4px, transparent 1.6px)",
            backgroundSize: "auto, 10px 12px",
            backgroundPosition: "0 0, 5px 6px",
          }}
        />
        <div className="absolute top-2 right-[10px] bottom-[24px] w-[2px] bg-[#3a63d6]/70" />
        <div className="absolute top-2 right-[28px] bottom-[24px] w-[2px] bg-[#d24040]/70" />
        <div
          className="absolute top-2 right-[15px] bottom-[24px] w-[10px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 60px, #ece9e2 60px 72px), radial-gradient(circle, #6f6b62 1.4px, transparent 1.6px)",
            backgroundSize: "auto, 10px 12px",
            backgroundPosition: "0 0, 5px 6px",
          }}
        />
        <span className="absolute bottom-[6px] left-[13px] font-mono text-[12px] leading-none font-bold text-[#3a63d6]">
          -
        </span>
        <span className="absolute bottom-[6px] left-[31px] font-mono text-[12px] leading-none font-bold text-[#d24040]">
          +
        </span>
        <span className="absolute right-[7px] bottom-[6px] font-mono text-[12px] leading-none font-bold text-[#3a63d6]">
          -
        </span>
        <span className="absolute right-[25px] bottom-[6px] font-mono text-[12px] leading-none font-bold text-[#d24040]">
          +
        </span>
      </div>

      <Wires />

      {/* TFT display module: black screen with blue PCB rails on the sides.
          The dark background lives on the screen area (not this box) so the
          masked mount holes in the rails stay truly see-through. */}
      <div className="absolute top-[36px] left-[52px] z-20 w-[236px] shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
        <div
          className="absolute inset-y-0 left-0 w-[24px] bg-[#2456c9]"
          style={stripMaskStyle}
        />
        <div
          className="absolute inset-y-0 right-0 w-[24px] bg-[#2456c9]"
          style={stripMaskStyle}
        />
        {/* Solder pads on the left edge where the jumpers land: plain black
            squares */}
        <div className="absolute top-[101px] -left-[5px] flex flex-col gap-[5px]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="size-[9px] bg-[#0b0d10]" />
          ))}
        </div>

        {/* The screen carries every HUD element. The half-pixel text-shadow
            fattens VT323's strokes toward LCD-pixel chunkiness without going
            full double-wide. */}
        <div className="mx-[24px] flex flex-col gap-[9px] bg-[#050a0d] px-4 py-3.5 font-lcd text-[20px] leading-none [text-shadow:0.5px_0_0_currentColor]">
          <div className={lcdText}>&gt; SYNTH CFG</div>
          <ScreenDivider />

          <div className={`flex items-center justify-between ${lcdText}`}>
            <span>Key</span>
            <Select
              items={KEYS.map((k) => ({ value: k.note, label: k.label }))}
              value={keyNote}
              onValueChange={(value) => onKeyNoteChange(value as KeyNote)}
            >
              <SelectTrigger className={screenTriggerClass} aria-label="Key">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={screenContentClass}>
                {KEYS.map((k) => (
                  <SelectItem key={k.note} value={k.note} className={screenItemClass}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={`flex items-center justify-between ${lcdText}`}>
            <span>Tone</span>
            <Select
              items={WAVEFORMS.map((w) => ({ value: w.value, label: w.label }))}
              value={waveform}
              onValueChange={(value) => onWaveformChange(value as Waveform)}
            >
              <SelectTrigger className={screenTriggerClass} aria-label="Tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={screenContentClass}>
                {WAVEFORMS.map((w) => (
                  <SelectItem
                    key={w.value}
                    value={w.value}
                    className={screenItemClass}
                  >
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScreenDivider />

          <div className={`flex items-center gap-2 ${lcdText}`}>
            <span>Vol</span>
            <div className="h-[13px] flex-1 border-2 border-[#8ed4ef] p-[1.5px]">
              <div
                className="h-full bg-linear-to-r from-[#8ed4ef] to-[#c9eefa]"
                style={{ width: `${volumeFraction * 100}%` }}
              />
            </div>
          </div>
          <div className={`flex items-center justify-between ${lcdText}`}>
            <span>Flt</span>
            <span>
              {filterPercent > 0 ? "+" : ""}
              {filterPercent}%
            </span>
          </div>

          {aiKeyNeeded && (
            <div className={`flex items-center justify-between ${lcdText}`}>
              <span>AI</span>
              <AiKeyDialog
                apiKey={aiKey}
                onApiKeyChange={onAiKeyChange}
                trigger={
                  <button
                    type="button"
                    className={`cursor-pointer font-lcd text-[20px] leading-none ${lcdDim} hover:text-[#ace6f8]`}
                  />
                }
                label={aiKey ? "Key Set" : "Set Key"}
              />
            </div>
          )}

          <ScreenDivider />

          <HelpDialog
            trigger={
              <button
                type="button"
                className={`w-fit cursor-pointer font-lcd text-[20px] leading-none ${lcdDim} hover:text-[#ace6f8]`}
              />
            }
            label="? Help"
          />
        </div>
      </div>
    </div>
  )
}
