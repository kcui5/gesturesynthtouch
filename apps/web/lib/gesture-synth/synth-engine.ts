// Oscillators -> waveshaper -> lowpass filter -> master gain -> output
export class SynthEngine {
  ctx: AudioContext | null = null
  private filter: BiquadFilterNode | null = null
  private waveShaper: WaveShaperNode | null = null
  private masterGain: GainNode | null = null
  private oscillators: OscillatorNode[] = []
  currentKey: string | null = null

  ensureContext() {
    if (this.ctx) return
    this.ctx = new AudioContext()

    this.waveShaper = this.ctx.createWaveShaper()
    this.waveShaper.curve = null
    this.waveShaper.oversample = "4x" // Reduces aliasing harshness

    this.filter = this.ctx.createBiquadFilter()
    this.filter.type = "lowpass"
    this.filter.frequency.value = 1200
    this.filter.Q.value = 0.7

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0

    this.waveShaper.connect(this.filter)
    this.filter.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)
  }

  setVolume(volume01: number) {
    if (!this.ctx || !this.masterGain) return
    const clamped = Math.max(0, Math.min(1, volume01))
    // Ramp to avoid audible clicks
    this.masterGain.gain.linearRampToValueAtTime(
      clamped,
      this.ctx.currentTime + 0.05
    )
  }

  updateFilterSweep(tiltFactor: number) {
    if (!this.filter || !this.ctx) return

    // Centered hand = neutral filter
    let targetFrequency = 1200
    let targetQ = 0.7

    if (tiltFactor < 0) {
      // Inward tilt: acoustic warmth with a subtle woody resonance
      const intensity = Math.abs(tiltFactor)
      targetFrequency = 1200 - intensity * 950
      targetQ = 0.7 + intensity * 1.5
    } else if (tiltFactor > 0) {
      // Outward tilt: EDM-style sweep with spiked resonance "squelch"
      targetFrequency = 1200 + tiltFactor * 3800
      targetQ = 0.7 + tiltFactor * 4.5
    }

    const now = this.ctx.currentTime
    this.filter.frequency.setTargetAtTime(targetFrequency, now, 0.04)
    this.filter.Q.setTargetAtTime(targetQ, now, 0.04)
  }

  playNotes(freqs: number[], waveform: OscillatorType) {
    if (!this.ctx || !this.waveShaper || freqs.length === 0) return
    const key = freqs.map((f) => f.toFixed(1)).join(",")
    if (key === this.currentKey) return

    this.stopOscillators()
    this.oscillators = freqs.map((freq) => {
      const osc = this.ctx!.createOscillator()
      osc.type = waveform
      osc.frequency.value = freq
      osc.connect(this.waveShaper!)
      osc.start()
      return osc
    })
    this.currentKey = key
  }

  stop() {
    this.setVolume(0)
    this.stopOscillators()
    this.currentKey = null
  }

  dispose() {
    this.stop()
    this.ctx?.close()
    this.ctx = null
  }

  private stopOscillators() {
    this.oscillators.forEach((osc) => {
      try {
        osc.stop()
      } catch {
        // Already stopped
      }
    })
    this.oscillators = []
  }
}
