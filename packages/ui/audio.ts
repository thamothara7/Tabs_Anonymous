import { VOICE_SERVER, serviceHeaders } from './voices';
import type { Cue } from '../game-core/types';

/** All effects are generated locally; speech uses Kokoro on this computer. */
export class SessionAudio {
  private context: AudioContext | null = null;
  private nodes = new Set<OscillatorNode>();
  private request: AbortController | null = null;
  private player: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private generation = 0;
  private level = 0.65;
  private prepared = new Map<string, Promise<Blob>>();
  private warmups = new Map<string, AbortController>();
  private speechKey(text: string, voiceId: string, emotion: string, therapist: boolean) {
    return JSON.stringify({ text, voiceId, emotion, therapist });
  }
  private async fetchSpeech(key: string, signal: AbortSignal): Promise<Blob> {
    const response = await fetch(`${VOICE_SERVER}/kokoro/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...serviceHeaders() },
      body: key,
      signal,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? 'Speech generation failed.');
    }
    return response.blob();
  }
  prefetch(text: string, voiceId: string, emotion: string, therapist: boolean) {
    const key = this.speechKey(text, voiceId, emotion, therapist);
    if (this.prepared.has(key)) return;
    this.cancelWarmups();
    const controller = new AbortController();
    this.warmups.set(key, controller);
    const pending = this.fetchSpeech(
      key,
      AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
    );
    this.prepared.set(key, pending);
    void pending.catch(() => this.prepared.delete(key)).finally(() => this.warmups.delete(key));
    while (this.prepared.size > 4) this.prepared.delete(this.prepared.keys().next().value!);
  }
  cancelWarmups() {
    for (const [key, controller] of this.warmups) {
      controller.abort();
      this.prepared.delete(key);
    }
    this.warmups.clear();
  }
  get volume() {
    return this.level;
  }
  set volume(value: number) {
    this.level = Math.max(0, Math.min(1, value));
    if (this.player) this.player.volume = this.level;
  }
  async speak(
    text: string,
    voiceId: string,
    emotion: string,
    therapist: boolean,
    done: () => void,
    fail: (message: string) => void,
    started: () => void = () => {},
  ) {
    this.stop();
    const generation = this.generation;
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), 125000);
    try {
      const key = this.speechKey(text, voiceId, emotion, therapist);
      let blob: Blob;
      const prepared = this.prepared.get(key);
      if (prepared) {
        const warming = this.warmups.get(key);
        if (warming)
          controller.signal.addEventListener('abort', () => warming.abort(), { once: true });
        this.warmups.delete(key); // Promoted to foreground. The generation guard owns playback.
        try {
          blob = await prepared;
        } catch {
          blob = await this.fetchSpeech(key, controller.signal);
        }
      } else blob = await this.fetchSpeech(key, controller.signal);
      this.prepared.delete(key);
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
    this.cancelWarmups();
    this.prepared.clear();
    void this.context?.close();
    this.context = null;
  }
}
export const lineDuration = (line: string) => Math.max(2600, line.split(/\s+/).length * 270 + 700);
