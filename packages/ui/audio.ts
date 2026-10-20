import { VOICE_SERVER } from './voices';
import type { Cue } from '../game-core/types';

/** All effects are generated locally; speech uses an explicitly selected local or cloud engine. */
export class SessionAudio {
  private context: AudioContext | null = null;
  private nodes = new Set<OscillatorNode>();
  private utterance: SpeechSynthesisUtterance | null = null;
  private request: AbortController | null = null;
  private player: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private generation = 0;
  private level = 0.65;
  get volume() {
    return this.level;
  }
  set volume(value: number) {
    this.level = Math.max(0, Math.min(1, value));
    if (this.player) this.player.volume = this.level;
  }
  async speakCloud(
    text: string,
    voiceId: string,
    emotion: string,
    therapist: boolean,
    done: () => void,
    fail: (message: string) => void,
    engine: 'cloud' | 'kokoro' = 'cloud',
    started: () => void = () => {},
  ) {
    this.stop();
    const generation = this.generation;
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), engine === 'kokoro' ? 125000 : 50000);
    try {
      const response = await fetch(
        `${VOICE_SERVER}${engine === 'kokoro' ? '/kokoro' : ''}/speech`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-TA-Client': '1' },
          body: JSON.stringify({ text, voiceId, emotion, therapist }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Speech generation failed.');
      }
      const blob = await response.blob();
      if (generation !== this.generation) return;
      this.objectUrl = URL.createObjectURL(blob);
      const player = new Audio(this.objectUrl);
      this.player = player;
      player.volume = this.volume;
      player.onended = () => {
        if (generation === this.generation) {
          this.stop();
          done();
        }
      };
      player.onerror = () => {
        if (generation === this.generation) {
          this.stop();
          fail('Generated audio could not play. Use Replay line to retry.');
        }
      };
      await player.play();
      if (generation === this.generation) started();
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        fail(
          error instanceof Error && error.name !== 'AbortError'
            ? error.message
            : 'Voice request timed out. Replay the line to retry.',
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }
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
  speak(text: string, voiceURI: string, pitch: number, onError: () => void, rate = 1) {
    this.cancelSpeech();
    const voice = this.voices().find((v) => v.voiceURI === voiceURI);
    if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(text);
    this.utterance = utterance;
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.volume = this.volume;
    utterance.rate = rate;
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
    this.generation++;
    this.request?.abort();
    this.request = null;
    if (this.player) {
      this.player.onended = null;
      this.player.onerror = null;
      this.player.pause();
      this.player.removeAttribute('src');
      this.player.load();
      this.player = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
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
