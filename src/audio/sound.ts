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
    this.musicTimer = window.setInterval(() => this.scheduleTheme(), 7200);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleTheme(): void {
    if (this._muted || !this.musicStarted) return;
    // Original web-hero motif: a bright upward leap, a suspense turn, and a safe landing.
    const melody = [220, 277.18, 329.63, 440, 392, 329.63, 293.66, 369.99, 440, 554.37, 493.88, 440];
    melody.forEach((frequency, index) => {
      const beat = index * 0.42;
      this.tone(frequency, index % 4 === 3 ? 0.32 : 0.19, index % 3 === 0 ? "triangle" : "sine", 0.018, beat);
      if (index % 4 === 0) {
        this.tone(frequency / 2, 0.55, "sine", 0.012, beat);
        this.tone(frequency * 1.5, 0.12, "triangle", 0.008, beat + 0.18);
      }
    });
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

  play(name: SoundName, streak = 0): void {
    if (this.muted) return;
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
