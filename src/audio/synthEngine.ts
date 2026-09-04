import { StagePhase, StemConfig, PresetTrack } from '../types';

export class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private distortionCurve: Float32Array;

  private stemGains: Map<string, GainNode> = new Map();
  private stemTargetVolumes: Map<string, number> = new Map();

  private isPlaying: boolean = false;
  private currentPhase: StagePhase = 'battle';
  private currentTrack: PresetTrack | null = null;
  private stems: StemConfig[] = [];

  private bpm: number = 140;
  private currentStep: number = 0;
  private timerId: number | null = null;

  private onStepCallback: ((step: number) => void) | null = null;

  constructor() {
    this.distortionCurve = this.makeDistortionCurve(25);
  }

  private makeDistortionCurve(amount: number = 25): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + amount) * x * 15 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master Compressor for modern punch & warmth
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.1, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.masterCompressor);
      this.masterCompressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public setTrackAndStems(track: PresetTrack, stems: StemConfig[]) {
    this.currentTrack = track;
    this.bpm = track.bpm;
    this.stems = stems;

    if (this.ctx && this.masterGain) {
      stems.forEach(stem => {
        if (!this.stemGains.has(stem.id)) {
          const gain = this.ctx!.createGain();
          gain.gain.setValueAtTime(stem.volume, this.ctx!.currentTime);
          gain.connect(this.masterGain!);
          this.stemGains.set(stem.id, gain);
        }
      });
    }

    this.updatePhaseVolumes(this.currentPhase);
  }

  public setPhase(phase: StagePhase) {
    this.currentPhase = phase;
    this.updatePhaseVolumes(phase);
  }

  public getPhase(): StagePhase {
    return this.currentPhase;
  }

  private updatePhaseVolumes(phase: StagePhase) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const transitionTime = 0.8; // Smooth crossfade

    const hasSolo = this.stems.some(s => s.solo);

    this.stems.forEach(stem => {
      const gainNode = this.stemGains.get(stem.id);
      if (!gainNode) return;

      let targetVol = stem.phaseVolumes[phase] * stem.volume;

      if (stem.muted) {
        targetVol = 0;
      } else if (hasSolo && !stem.solo) {
        targetVol = 0;
      }

      this.stemTargetVolumes.set(stem.id, targetVol);

      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.linearRampToValueAtTime(targetVol, now + transitionTime);
    });
  }

  public updateStemUserConfig(stemId: string, volume: number, muted: boolean, solo: boolean) {
    const stem = this.stems.find(s => s.id === stemId);
    if (stem) {
      stem.volume = volume;
      stem.muted = muted;
      stem.solo = solo;
    }
    this.updatePhaseVolumes(this.currentPhase);
  }

  public setMasterVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  public setBpm(newBpm: number) {
    this.bpm = newBpm;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  public setOnStepCallback(cb: (step: number) => void) {
    this.onStepCallback = cb;
  }

  public start() {
    this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentStep = 0;

    const stepIntervalMs = (60 / this.bpm / 4) * 1000; // 16th note

    const tick = () => {
      if (!this.isPlaying) return;

      this.playStep(this.currentStep);

      if (this.onStepCallback) {
        this.onStepCallback(this.currentStep);
      }

      this.currentStep = (this.currentStep + 1) % 16;
      this.timerId = window.setTimeout(tick, stepIntervalMs);
    };

    tick();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /* ------------------------------------------------------------------
   * Real-time Web Audio Synthesis
   * ------------------------------------------------------------------ */
  private playStep(step: number) {
    if (!this.ctx || !this.currentTrack) return;
    const now = this.ctx.currentTime;
    const p = this.currentTrack.pattern;

    // 1. DRUMS (stem-drums)
    const drumGain = this.stemGains.get('stem-drums');
    if (drumGain && drumGain.gain.value > 0.01) {
      if (p.drumPattern[0][step]) this.synthKick(now, drumGain);
      if (p.drumPattern[1][step]) this.synthSnare(now, drumGain);
      if (p.drumPattern[2][step]) this.synthHiHat(now, drumGain, step % 2 === 0);
      if (p.drumPattern[3][step]) this.synthIndustrialPerc(now, drumGain);
    }

    // 2. BASS (stem-bass) - Payday 2 Heavy Industrial Sub/Saw Bass
    const bassGain = this.stemGains.get('stem-bass');
    if (bassGain && bassGain.gain.value > 0.01) {
      const pitchOffset = p.bassLine[step];
      if (pitchOffset !== undefined) {
        this.synthPaydayBass(now, bassGain, pitchOffset);
      }
    }

    // 3. HARMONY (stem-harmony) - Industrial Guitar Chugs / Synth Power Chords
    const harmonyGain = this.stemGains.get('stem-harmony');
    if (harmonyGain && harmonyGain.gain.value > 0.01) {
      if (step % 4 === 0) {
        const chordIndex = Math.floor(step / 4) % p.harmonyChords.length;
        const chord = p.harmonyChords[chordIndex];
        this.synthIndustrialGuitarChug(now, harmonyGain, chord);
      }
    }

    // 4. LEAD / ARCANE ARP (stem-lead) - Detuned Supersaw Arcane Lead
    const leadGain = this.stemGains.get('stem-lead');
    if (leadGain && leadGain.gain.value > 0.01) {
      const pitch = p.leadArp[step];
      if (pitch !== undefined) {
        this.synthSupersawLead(now, leadGain, pitch);
      }
    }

    // 5. BOSS / CHOIR BRASS (stem-boss) - Epic Choir & Brass Stems
    const bossGain = this.stemGains.get('stem-boss');
    if (bossGain && bossGain.gain.value > 0.01) {
      if (step % 2 === 0) {
        const pitch = p.leadArp[step] + 12;
        this.synthBossChoirBrass(now, bossGain, pitch);
      }
    }
  }

  /* ---------------- High Quality Modern Synth Instruments ---------------- */

  /** Heavy Punchy Punch Kick (Industrial Electro) */
  private synthKick(time: number, output: GainNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    gain.gain.setValueAtTime(1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    // Click transient for punch
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1200, time);
    clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02);
    clickGain.gain.setValueAtTime(0.6, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(output);
    clickOsc.start(time);
    clickOsc.stop(time + 0.025);

    osc.connect(gain);
    gain.connect(output);
    osc.start(time);
    osc.stop(time + 0.23);
  }

  /** Modern Snare with Metallic Snap & Noise Tail */
  private synthSnare(time: number, output: GainNode) {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(output);

    // Body punch tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.12);

    oscGain.gain.setValueAtTime(0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(oscGain);
    oscGain.connect(output);

    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  /** Crisp Metallic Hi-Hat */
  private synthHiHat(time: number, output: GainNode, isAccent: boolean) {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8500;

    const gain = this.ctx.createGain();
    const vol = isAccent ? 0.4 : 0.2;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    noise.start(time);
    noise.stop(time + 0.06);
  }

  /** Heavy Industrial Perc / Anvil Impact */
  private synthIndustrialPerc(time: number, output: GainNode) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(320, time);
    osc2.frequency.setValueAtTime(175, time);

    osc1.frequency.exponentialRampToValueAtTime(45, time + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(30, time + 0.15);

    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.17);
    osc2.stop(time + 0.17);
  }

  /** Payday 2 Signature Heavy Industrial Detuned Bass with Waveshaper Distortion & Resonant Filter Envelope */
  private synthPaydayBass(time: number, output: GainNode, semitoneOffset: number) {
    if (!this.ctx) return;
    const baseFreq = 55; // A1 (~55Hz)
    const freq = baseFreq * Math.pow(2, semitoneOffset / 12);

    // 3 Detuned Sawtooth Oscillators + 1 Sub Sine
    const saw1 = this.ctx.createOscillator();
    const saw2 = this.ctx.createOscillator();
    const subSine = this.ctx.createOscillator();

    saw1.type = 'sawtooth';
    saw2.type = 'sawtooth';
    subSine.type = 'sine';

    saw1.frequency.setValueAtTime(freq * 0.993, time);
    saw2.frequency.setValueAtTime(freq * 1.007, time);
    subSine.frequency.setValueAtTime(freq / 2, time); // Sub-octave

    // Resonant Lowpass Filter with Envelope Sweep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 4.5;
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + 0.18);

    // Distortion WaveShaper
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.distortionCurve;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    saw1.connect(filter);
    saw2.connect(filter);
    subSine.connect(gain); // Sub bypasses distortion for clean low end

    filter.connect(shaper);
    shaper.connect(gain);
    gain.connect(output);

    saw1.start(time);
    saw2.start(time);
    subSine.start(time);

    saw1.stop(time + 0.24);
    saw2.stop(time + 0.24);
    subSine.stop(time + 0.24);
  }

  /** Industrial Guitar Power Chord Chug (Harmonies) */
  private synthIndustrialGuitarChug(time: number, output: GainNode, chordName: string) {
    if (!this.ctx) return;
    const freqs = this.getChordFrequencies(chordName);

    freqs.forEach((freq, i) => {
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const shaper = this.ctx!.createWaveShaper();
      const gain = this.ctx!.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 1.006, time);

      shaper.curve = this.distortionCurve;

      filter.type = 'lowpass';
      if (this.currentPhase === 'result') {
        filter.frequency.value = 700; // Calm pad in result phase
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
        osc1.connect(filter);
        filter.connect(gain);
      } else {
        filter.frequency.setValueAtTime(3500, time);
        filter.frequency.exponentialRampToValueAtTime(1200, time + 0.4);
        gain.gain.setValueAtTime(0.22, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc1.connect(shaper);
        osc2.connect(shaper);
        shaper.connect(filter);
        filter.connect(gain);
      }

      gain.connect(output);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.75);
      osc2.stop(time + 0.75);
    });
  }

  /** Detuned Supersaw Arcane Lead Synth */
  private synthSupersawLead(time: number, output: GainNode, pitchOffset: number) {
    if (!this.ctx) return;
    const baseFreq = 220; // A3
    const freq = baseFreq * Math.pow(2, pitchOffset / 12);

    if (this.currentPhase === 'result') {
      // Ethereal Sine/Glockenspiel Bell in Result
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      gain.connect(output);
      osc.start(time);
      osc.stop(time + 0.22);
      return;
    }

    // 3 Supersaw Oscillators for rich modern lead sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'square';

    osc1.frequency.setValueAtTime(freq * 0.994, time);
    osc2.frequency.setValueAtTime(freq * 1.006, time);
    osc3.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.5;
    filter.frequency.setValueAtTime(4500, time);
    filter.frequency.exponentialRampToValueAtTime(1800, time + 0.14);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    osc1.stop(time + 0.16);
    osc2.stop(time + 0.16);
    osc3.stop(time + 0.16);
  }

  /** Epic Boss Choir Formant & Brass Stacks */
  private synthBossChoirBrass(time: number, output: GainNode, pitchOffset: number) {
    if (!this.ctx) return;
    const baseFreq = 220;
    const freq = baseFreq * Math.pow(2, pitchOffset / 12);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'sawtooth';

    osc1.frequency.setValueAtTime(freq * 0.992, time);
    osc2.frequency.setValueAtTime(freq * 1.008, time);
    osc3.frequency.setValueAtTime(freq * 0.5, time); // Octave down brass punch

    // Vocal Formant Filter (Ah / Oh Choir Formant)
    const formantFilter1 = this.ctx.createBiquadFilter();
    formantFilter1.type = 'bandpass';
    formantFilter1.frequency.value = 800; // F1
    formantFilter1.Q.value = 4;

    const formantFilter2 = this.ctx.createBiquadFilter();
    formantFilter2.type = 'bandpass';
    formantFilter2.frequency.value = 1400; // F2
    formantFilter2.Q.value = 4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc1.connect(formantFilter1);
    osc2.connect(formantFilter2);
    osc3.connect(gain); // Brass sub

    formantFilter1.connect(gain);
    formantFilter2.connect(gain);
    gain.connect(output);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    osc1.stop(time + 0.32);
    osc2.stop(time + 0.32);
    osc3.stop(time + 0.32);
  }

  private getChordFrequencies(chordName: string): number[] {
    const noteToSemitone: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    // Match note root (e.g., C#, Db, F, A) and suffix (m, 7, maj7, etc.)
    const match = chordName.match(/^([A-G][#b]?)(.*)$/);
    if (!match) {
      return [174.61, 174.61 * 1.26, 174.61 * 1.498]; // Fallback to F major
    }

    const noteRoot = match[1];
    const quality = match[2].toLowerCase();

    const semitoneOffset = noteToSemitone[noteRoot] ?? 5; // Default to F
    // Base root C3 is ~130.81 Hz
    const rootFreq = 130.81 * Math.pow(2, semitoneOffset / 12);

    if (quality.includes('m7') || quality.includes('min7')) {
      return [
        rootFreq,
        rootFreq * Math.pow(2, 3 / 12),
        rootFreq * Math.pow(2, 7 / 12),
        rootFreq * Math.pow(2, 10 / 12)
      ];
    } else if (quality.includes('maj7')) {
      return [
        rootFreq,
        rootFreq * Math.pow(2, 4 / 12),
        rootFreq * Math.pow(2, 7 / 12),
        rootFreq * Math.pow(2, 11 / 12)
      ];
    } else if (quality.includes('7')) {
      return [
        rootFreq,
        rootFreq * Math.pow(2, 4 / 12),
        rootFreq * Math.pow(2, 7 / 12),
        rootFreq * Math.pow(2, 10 / 12)
      ];
    } else if (quality.includes('m') || quality.includes('min')) {
      return [
        rootFreq,
        rootFreq * Math.pow(2, 3 / 12),
        rootFreq * Math.pow(2, 7 / 12)
      ];
    } else if (quality.includes('sus4')) {
      return [
        rootFreq,
        rootFreq * Math.pow(2, 5 / 12),
        rootFreq * Math.pow(2, 7 / 12)
      ];
    } else if (quality.includes('dim')) {
      return [
        rootFreq,
        rootFreq * Math.pow(2, 3 / 12),
        rootFreq * Math.pow(2, 6 / 12)
      ];
    } else if (quality.includes('5')) {
      return [
        rootFreq,
        rootFreq * Math.pow(2, 7 / 12),
        rootFreq * 2
      ];
    } else {
      // Standard major triad
      return [
        rootFreq,
        rootFreq * Math.pow(2, 4 / 12),
        rootFreq * Math.pow(2, 7 / 12)
      ];
    }
  }

  /* ------------------------------------------------------------------
   * Offline Audio Context Rendering for WAV Download (High Quality)
   * ------------------------------------------------------------------ */
  public async renderWavBuffer(
    durationSec: number,
    phase: StagePhase,
    isolatedStemId?: string
  ): Promise<Blob> {
    if (!this.currentTrack) {
      throw new Error('No track selected for rendering');
    }

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);

    const masterCompressor = offlineCtx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-12, 0);
    masterCompressor.knee.setValueAtTime(10, 0);
    masterCompressor.ratio.setValueAtTime(6, 0);
    masterCompressor.attack.setValueAtTime(0.005, 0);
    masterCompressor.release.setValueAtTime(0.1, 0);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.8, 0);

    masterGain.connect(masterCompressor);
    masterCompressor.connect(offlineCtx.destination);

    const track = this.currentTrack;
    const p = track.pattern;
    const bpm = track.bpm;
    const stepDuration = 60 / bpm / 4;
    const totalSteps = Math.floor(durationSec / stepDuration);

    const stemsToRender = isolatedStemId
      ? this.stems.filter(s => s.id === isolatedStemId)
      : this.stems;

    stemsToRender.forEach(stem => {
      let targetVol = stem.phaseVolumes[phase] * stem.volume;
      if (stem.muted) targetVol = 0;

      if (targetVol <= 0.001) return;

      const stemGain = offlineCtx.createGain();
      stemGain.gain.setValueAtTime(targetVol, 0);
      stemGain.connect(masterGain);

      for (let s = 0; s < totalSteps; s++) {
        const time = s * stepDuration;
        const stepInPattern = s % 16;

        if (stem.category === 'drums') {
          if (p.drumPattern[0][stepInPattern]) this.renderKick(offlineCtx, stemGain, time);
          if (p.drumPattern[1][stepInPattern]) this.renderSnare(offlineCtx, stemGain, time);
          if (p.drumPattern[2][stepInPattern]) this.renderHiHat(offlineCtx, stemGain, time);
          if (p.drumPattern[3][stepInPattern]) this.renderPerc(offlineCtx, stemGain, time);
        } else if (stem.category === 'bass') {
          const pitch = p.bassLine[stepInPattern];
          if (pitch !== undefined) this.renderBass(offlineCtx, stemGain, time, pitch);
        } else if (stem.category === 'harmony') {
          if (stepInPattern % 4 === 0) {
            const chordIndex = Math.floor(stepInPattern / 4) % p.harmonyChords.length;
            const chord = p.harmonyChords[chordIndex];
            this.renderHarmony(offlineCtx, stemGain, time, chord, phase);
          }
        } else if (stem.category === 'lead') {
          const pitch = p.leadArp[stepInPattern];
          if (pitch !== undefined) this.renderLead(offlineCtx, stemGain, time, pitch, phase);
        } else if (stem.category === 'boss') {
          if (stepInPattern % 2 === 0) {
            const pitch = p.leadArp[stepInPattern] + 12;
            this.renderBoss(offlineCtx, stemGain, time, pitch);
          }
        }
      }
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWavBlob(renderedBuffer);
  }

  /* Render Helpers for Offline Context */
  private renderKick(ctx: OfflineAudioContext, dest: GainNode, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
    gain.gain.setValueAtTime(1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.23);
  }

  private renderSnare(ctx: OfflineAudioContext, dest: GainNode, time: number) {
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(time);
    noise.stop(time + 0.2);
  }

  private renderHiHat(ctx: OfflineAudioContext, dest: GainNode, time: number) {
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  private renderPerc(ctx: OfflineAudioContext, dest: GainNode, time: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(320, time);
    osc2.frequency.setValueAtTime(175, time);
    osc1.frequency.exponentialRampToValueAtTime(45, time + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.17);
    osc2.stop(time + 0.17);
  }

  private renderBass(ctx: OfflineAudioContext, dest: GainNode, time: number, offset: number) {
    const freq = 55 * Math.pow(2, offset / 12);
    const saw1 = ctx.createOscillator();
    const saw2 = ctx.createOscillator();
    const subSine = ctx.createOscillator();

    saw1.type = 'sawtooth';
    saw2.type = 'sawtooth';
    subSine.type = 'sine';

    saw1.frequency.setValueAtTime(freq * 0.993, time);
    saw2.frequency.setValueAtTime(freq * 1.007, time);
    subSine.frequency.setValueAtTime(freq / 2, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 4.5;
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + 0.18);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.distortionCurve;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    saw1.connect(filter);
    saw2.connect(filter);
    subSine.connect(gain);

    filter.connect(shaper);
    shaper.connect(gain);
    gain.connect(dest);

    saw1.start(time);
    saw2.start(time);
    subSine.start(time);

    saw1.stop(time + 0.24);
    saw2.stop(time + 0.24);
    subSine.stop(time + 0.24);
  }

  private renderHarmony(
    ctx: OfflineAudioContext,
    dest: GainNode,
    time: number,
    chordName: string,
    phase: StagePhase
  ) {
    const freqs = this.getChordFrequencies(chordName);
    freqs.forEach(freq => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const shaper = ctx.createWaveShaper();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 1.006, time);

      shaper.curve = this.distortionCurve;

      filter.type = 'lowpass';
      if (phase === 'result') {
        filter.frequency.value = 700;
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
        osc1.connect(filter);
        filter.connect(gain);
      } else {
        filter.frequency.setValueAtTime(3500, time);
        filter.frequency.exponentialRampToValueAtTime(1200, time + 0.4);
        gain.gain.setValueAtTime(0.22, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc1.connect(shaper);
        osc2.connect(shaper);
        shaper.connect(filter);
        filter.connect(gain);
      }

      gain.connect(dest);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.75);
      osc2.stop(time + 0.75);
    });
  }

  private renderLead(
    ctx: OfflineAudioContext,
    dest: GainNode,
    time: number,
    offset: number,
    phase: StagePhase
  ) {
    const freq = 220 * Math.pow(2, offset / 12);

    if (phase === 'result') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.22);
      return;
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'square';

    osc1.frequency.setValueAtTime(freq * 0.994, time);
    osc2.frequency.setValueAtTime(freq * 1.006, time);
    osc3.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.5;
    filter.frequency.setValueAtTime(4500, time);
    filter.frequency.exponentialRampToValueAtTime(1800, time + 0.14);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    osc1.stop(time + 0.16);
    osc2.stop(time + 0.16);
    osc3.stop(time + 0.16);
  }

  private renderBoss(ctx: OfflineAudioContext, dest: GainNode, time: number, offset: number) {
    const freq = 220 * Math.pow(2, offset / 12);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'sawtooth';

    osc1.frequency.setValueAtTime(freq * 0.992, time);
    osc2.frequency.setValueAtTime(freq * 1.008, time);
    osc3.frequency.setValueAtTime(freq * 0.5, time);

    const formantFilter1 = ctx.createBiquadFilter();
    formantFilter1.type = 'bandpass';
    formantFilter1.frequency.value = 800;
    formantFilter1.Q.value = 4;

    const formantFilter2 = ctx.createBiquadFilter();
    formantFilter2.type = 'bandpass';
    formantFilter2.frequency.value = 1400;
    formantFilter2.Q.value = 4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc1.connect(formantFilter1);
    osc2.connect(formantFilter2);
    osc3.connect(gain);

    formantFilter1.connect(gain);
    formantFilter2.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    osc1.stop(time + 0.32);
    osc2.stop(time + 0.32);
    osc3.stop(time + 0.32);
  }

  /* Convert AudioBuffer to 16-bit PCM WAV Blob */
  private audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const numFrames = buffer.length;
    const dataSize = numFrames * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    for (let frame = 0; frame < numFrames; frame++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][frame];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const globalSynthEngine = new AudioSynthEngine();
