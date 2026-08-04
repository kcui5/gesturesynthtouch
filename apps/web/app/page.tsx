import { GestureSynth } from "@/components/gesture-synth/gesture-synth"

export const metadata = {
  title: "Gesture Synth Touch",
  description: "A gesture synth for the web with TouchDesigner-esque effects. Enable your webcam and hold your hands up to start making cool music!",
}

export default function Page() {
  return <GestureSynth />
}
