import { GestureSynth } from "@/components/gesture-synth/gesture-synth"

export default function Page() {
  return (
    <>
      {/* The app itself is a canvas; give crawlers and screen readers a
          real heading describing it. */}
      <h1 className="sr-only">
        Gesture Synth Touch — a webcam gesture-controlled synthesizer in the
        browser
      </h1>
      <GestureSynth />
    </>
  )
}
