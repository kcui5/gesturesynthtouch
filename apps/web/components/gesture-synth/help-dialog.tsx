"use client"

import { useRef } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-pixel text-base text-(--synth-text)">{title}</h3>
      <div className="font-mono text-sm leading-snug text-white/85">
        {children}
      </div>
    </div>
  )
}

type HelpDialogProps = {
  // Element rendered as the dialog trigger (props are merged onto it);
  // `label` becomes its children.
  trigger: React.ReactElement
  label: React.ReactNode
}

export function HelpDialog({ trigger, label }: HelpDialogProps) {
  // Focus the title on open so the scrollable guide starts at the top
  // instead of auto-focusing the link at the bottom.
  const titleRef = useRef<HTMLHeadingElement | null>(null)

  return (
    <Dialog>
      <DialogTrigger render={trigger}>{label}</DialogTrigger>

      <DialogContent
        initialFocus={titleRef}
        className="max-h-[80vh] gap-4 overflow-y-auto border-2 border-(--synth-border) bg-(--synth-panel) text-white shadow-[6px_6px_0_rgba(0,0,0,0.6)] ring-0 sm:max-w-lg **:data-[slot=dialog-close]:text-(--synth-text)"
      >
        <DialogHeader>
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="font-pixel text-lg text-(--synth-text) outline-none"
          >
            Gesture Synth Guide
          </DialogTitle>
          <p className="font-mono text-sm leading-snug text-white/85">
            Built on the beautiful work of{" "}
            <a
              href="https://indecisiveeric.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--synth-text) underline underline-offset-2 hover:text-white"
            >
              Eric Wei
            </a>{" "}
            &{" "}
            <a
              href="https://github.com/sophiamyang/finger-frame-effect-lucy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--synth-text) underline underline-offset-2 hover:text-white"
            >
              Sophia Yang
            </a>
            !
          </p>
        </DialogHeader>

        <Section title="Left Hand">
          <p>
            <b>Tilt</b>
            <br />
            Inward → Major
            <br />
            Outward → Minor
          </p>
          <p className="mt-2">
            <b>Fingers (Scale Degree)</b>
            <br />
            1 → I<br />
            2 → II
            <br />
            3 → III
            <br />
            4 → IV
            <br />
            5 → V<br />
            Index + Pinky → VI
            <br />
            Index + Pinky + Thumb → VII
          </p>
        </Section>

        <Section title="Right Hand">
          <p>
            <b>Fingers (Chord Quality)</b>
            <br />
            1 → Root Position
            <br />
            2 → 1st Inversion
            <br />
            3 → Major/Minor 7th
            <br />
            4 → Dominant/Diminished 7th
          </p>
          <p className="mt-2">
            <b>Octave</b>
            <br />
            Thumb In → higher octave
            <br />
            Thumb Out → lower octave
          </p>
          <p className="mt-2">
            <b>Tilt</b>
            <br />
            Inward → More Filter
            <br />
            Outward → Less Filter
          </p>
          <p className="mt-2">
            <b>Height</b>
            <br />
            Higher → Louder
            <br />
            Lower → Softer
          </p>
        </Section>
      </DialogContent>
    </Dialog>
  )
}
