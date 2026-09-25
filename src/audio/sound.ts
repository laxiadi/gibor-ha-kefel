type SoundName =
  | "click"
  | "correct"
  | "wrong"
  | "tick"
  | "web"
  | "snack"
  | "purchase"
  | "unlock"
  | "boss"
  | "venom"
  | "level";

class SoundBus {
  private context: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStarted = false;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    if (value) this.stopMusic();
  }

  private getContext(): AudioContext | null {
    if (this._muted) return null;
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return null;
    this.context ??= new Audio();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  startMusic(): void {
    if (this._muted || this.musicTimer !== null) return;
    this.musicStarted = true;
    this.scheduleTheme();
    this.musicTimer = window.setInterval(() => this.scheduleTheme(), 11040);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleTheme(): void {
    if (this._muted || !this.musicStarted) return;
    // Original cinematic web-hero theme: syncopated bass, climbing brass, strings and swing percussion.
    const beat = 0.46;
    const bass = [110, 110, 146.83, 110, 98, 98, 130.81, 98, 123.47, 123.47, 164.81, 123.47, 110, 110, 146.83, 110, 98, 110, 123.47, 146.83, 164.81, 146.83, 123.47, 110];
    bass.forEach((frequency, index) => {
      this.tone(frequency, beat * 0.7, "square", 0.009, index * beat);
      if (index % 2 === 0) this.sweep(105, 48, 0.13, "sine", 0.028, index * beat);
      if (index % 4 === 2) this.noise(0.1, 0.012, index * beat, 1700);
    });

    const melody: Array<[number, number]> = [
      [329.63, 0], [392, 1], [493.88, 2], [440, 3.5],
      [369.99, 5], [329.63, 6], [440, 7], [554.37, 8.5],
      [493.88, 10], [392, 11], [369.99, 12.5], [293.66, 14],
      [329.63, 15], [415.3, 16], [493.88, 17], [587.33, 18.5],
      [554.37, 20], [493.88, 21], [440, 22], [329.63, 23],
    ];
    melody.forEach(([frequency, position], index) => {
      this.tone(frequency, beat * (index % 4 === 3 ? 1.05 : 0.58), index % 3 === 0 ? "sawtooth" : "triangle", 0.014, position * beat);
      this.tone(frequency * 2, beat * 0.2, "sine", 0.004, position * beat);
    });

    const chords = [
      [220, 261.63, 329.63],
      [196, 246.94, 293.66],
      [174.61, 220, 261.63],
      [164.81, 207.65, 246.94],
    ];
    chords.forEach((chord, index) => chord.forEach((frequency) => {
      this.tone(frequency, beat * 1.65, "sawtooth", 0.0045, index * beat * 6);
      this.tone(frequency * 2, beat * 1.4, "triangle", 0.0035, index * beat * 6 + 0.06);
    }));
  }

  private tone(frequency: number, duration: number, type: OscillatorType, gain: number, delay = 0): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    volume.gain.setValueAtTime(gain, start);
    volume.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private sweep(from: number, to: number, duration: number, type: OscillatorType, gain: number, delay = 0): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    volume.gain.setValueAtTime(gain, start);
    volume.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(duration: number, gain: number, delay = 0, highpass = 900): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = highpass;
    volume.gain.setValueAtTime(gain, start);
    volume.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(volume);
    volume.connect(context.destination);
    source.start(start);
    source.stop(start + duration);
  }

  play(name: SoundName, streak = 0): void {
    if (this.muted) return;
    if (name === "web") {
      this.sweep(260, 1450, 0.16, "sawtooth", 0.045);
      this.sweep(980, 180, 0.32, "sine", 0.028, 0.09);
      this.noise(0.12, 0.02, 0.03, 2200);
      return;
    }
    const sequences: Record<SoundName, Array<[number, number, OscillatorType, number, number?]>> = {
      click: [[540, 0.04, "sine", 0.04]],
      correct: [
        [523 + Math.min(streak, 8) * 18, 0.08, "square", 0.07],
        [784, 0.13, "sine", 0.07, 0.07],
        [1047, 0.16, "triangle", 0.06, 0.14],
      ],
      wrong: [[130, 0.24, "sawtooth", 0.1], [92, 0.3, "triangle", 0.06, 0.1]],
      tick: [[880, 0.035, "square", 0.035]],
      web: [[420, 0.07, "sawtooth", 0.045], [1200, 0.12, "sine", 0.04, 0.04]],
      snack: [[660, 0.08, "sine", 0.07], [990, 0.12, "triangle", 0.06, 0.06]],
      purchase: [[392, 0.1, "sine", 0.07], [587, 0.1, "sine", 0.07, 0.08], [784, 0.15, "sine", 0.07, 0.16]],
      unlock: [[392, 0.14, "triangle", 0.08], [523, 0.14, "triangle", 0.08, 0.1], [784, 0.2, "triangle", 0.08, 0.2]],
      boss: [[110, 0.32, "sawtooth", 0.09], [165, 0.4, "square", 0.06, 0.26]],
      venom: [[74, 0.65, "sawtooth", 0.08], [148, 0.5, "triangle", 0.06, 0.2], [55, 0.7, "sine", 0.08, 0.35]],
      level: [[220, 0.12, "triangle", 0.08], [330, 0.12, "triangle", 0.07, 0.1], [440, 0.16, "sine", 0.07, 0.2], [660, 0.24, "sine", 0.05, 0.31]],
    };
    for (const args of sequences[name]) this.tone(...args);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const sounds = new SoundBus();
