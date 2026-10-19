import type { Cue } from '../game-core/types';

/** All effects are generated locally; speech uses installed device voices only. */
export class SessionAudio {
  private context: AudioContext | null = null;
  private nodes = new Set<OscillatorNode>();
  private utterance: SpeechSynthesisUtterance | null = null;
  volume = 0.65;
  async unlock() {
    this.context ??= new AudioContext();
    if (this.context.state !== 'running') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Audio is suspended');
  }
  voices() {
    return typeof speechSynthesis === 'undefined'
      ? []
      : speechSynthesis.getVoices().filter((v) => v.localService && /^en(?:-|$)/i.test(v.lang));
  }
  effect(cue: Cue = 'talk') {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const notes =
      cue === 'victory'
        ? [523, 659, 784]
        : cue === 'retire'
          ? [392, 330, 220]
          : cue === 'popcorn'
            ? [260, 390, 520, 260]
            : cue === 'duplicate'
              ? [220, 233, 220]
              : [440, 554];
    notes.forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.2, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this.nodes.add(osc);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.nodes.delete(osc);
      };
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }
  speak(text: string, voiceURI: string, pitch: number, onError: () => void) {
    this.cancelSpeech();
    const voice = this.voices().find((v) => v.voiceURI === voiceURI);
    if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(text);
    this.utterance = utterance;
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.volume = this.volume;
    utterance.rate = 1.08;
    utterance.pitch = pitch;
    utterance.onerror = (e) => {
      if (!['canceled', 'interrupted'].includes(e.error)) onError();
    };
    speechSynthesis.resume();
    speechSynthesis.speak(utterance);
  }
  cancelSpeech() {
    if (this.utterance) {
      this.utterance.onerror = null;
      this.utterance = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }
  stop() {
    this.cancelSpeech();
    this.nodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* Already ended. */
      }
    });
  }
  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
  }
}
export const lineDuration = (line: string) => Math.max(5500, line.split(/\s+/).length * 390 + 1600);
