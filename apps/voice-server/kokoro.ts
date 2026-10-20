import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';

export interface LocalVoice {
  id: string;
  name: string;
  labels?: Record<string, string>;
}
export interface SpeechInput {
  text: string;
  voiceId: string;
  emotion: string;
  therapist?: unknown;
}
export interface LocalSpeech {
  voices(signal: AbortSignal): Promise<LocalVoice[]>;
  speak(input: SpeechInput, signal: AbortSignal): Promise<Buffer>;
  close(): void;
}
export class KokoroWorker implements LocalSpeech {
  private child?: ChildProcessWithoutNullStreams;
  private startup?: Promise<LocalVoice[]>;
  private pending = new Map<
    number,
    { resolve: (value: Buffer) => void; reject: (error: Error) => void }
  >();
  private serial = 0;
  private start() {
    if (this.startup) return this.startup;
    const python = fileURLToPath(new URL('../../.venv-kokoro/bin/python', import.meta.url));
    if (!existsSync(python))
      return Promise.reject(new Error('Run npm run voice:setup once, then reconnect Kokoro.'));
    this.startup = new Promise<LocalVoice[]>((resolve, reject) => {
      const child = spawn(
        python,
        ['-u', fileURLToPath(new URL('./kokoro/worker.py', import.meta.url))],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      this.child = child;
      const startupTimeout = setTimeout(() => child.kill(), 110000);
      // Consume diagnostics without retaining or logging potentially sensitive input.
      child.stderr.resume();
      const lines = createInterface({ input: child.stdout });
      lines.on('line', (line) => {
        try {
          const data = JSON.parse(line);
          if (data.ready) {
            clearTimeout(startupTimeout);
            resolve(data.voices);
            return;
          }
          const request = this.pending.get(data.id);
          if (!request) return;
          this.pending.delete(data.id);
          if (data.error) request.reject(new Error(data.error));
          else request.resolve(Buffer.from(data.audio, 'base64'));
        } catch {
          /* Ignore non-protocol diagnostics. */
        }
      });
      const failed = () => {
        clearTimeout(startupTimeout);
        lines.close();
        const error = new Error(
          'Kokoro could not start. Run npm run voice:setup to install local models.',
        );
        reject(error);
        for (const p of this.pending.values()) p.reject(error);
        this.pending.clear();
        this.child = undefined;
        this.startup = undefined;
      };
      child.once('error', failed);
      child.once('exit', failed);
    });
    return this.startup;
  }
  async voices(signal: AbortSignal) {
    signal.throwIfAborted();
    let cancel = () => {};
    try {
      return await Promise.race([
        this.start(),
        new Promise<never>((_, reject) => {
          cancel = () => reject(new Error('Local voice startup canceled.'));
          signal.addEventListener('abort', cancel, { once: true });
        }),
      ]);
    } finally {
      signal.removeEventListener('abort', cancel);
    }
  }
  async speak(input: SpeechInput, signal: AbortSignal): Promise<Buffer> {
    await this.voices(signal);
    signal.throwIfAborted();
    if (this.pending.size >= 2) throw new Error('Local voice engine is busy. Retry shortly.');
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      const cancel = () => {
        // Keep this slot occupied until inference ends, so rapid cancellations cannot queue work.
        reject(new Error('Local speech canceled.'));
      };
      signal.addEventListener('abort', cancel, { once: true });
      this.pending.set(id, {
        resolve: (value) => {
          signal.removeEventListener('abort', cancel);
          resolve(value);
        },
        reject: (error) => {
          signal.removeEventListener('abort', cancel);
          reject(error);
        },
      });
      this.child!.stdin.write(JSON.stringify({ ...input, id }) + '\n');
    });
  }
  close() {
    const error = new Error('Kokoro worker closed.');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    const child = this.child;
    this.child = undefined;
    this.startup = undefined;
    child?.kill();
  }
}
