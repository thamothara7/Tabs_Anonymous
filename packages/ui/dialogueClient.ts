import type { DialogueInput, DialogueResult } from '../../apps/voice-server/dialogue';
import { VOICE_SERVER, serviceHeaders } from './voices';
/** One turn ahead only. A foreground turn reuses its pending request instead of starting again. */
export class DialogueClient {
  private entries = new Map<
    string,
    { controller: AbortController; promise: Promise<DialogueResult>; done: boolean }
  >();
  request(key: string, input: DialogueInput): Promise<DialogueResult> {
    const existing = this.entries.get(key);
    if (existing) return existing.promise;
    const controller = new AbortController();
    const entry = {
      controller,
      done: false,
      promise: Promise.resolve(null as unknown as DialogueResult),
    };
    entry.promise = (async () => {
      // A just-canceled background request can take a moment to release the writer.
      let response: Response | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch(`${VOICE_SERVER}/dialogue`, {
          method: 'POST',
          headers: { ...serviceHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        });
        if (response.status !== 429 || attempt === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 150));
        controller.signal.throwIfAborted();
      }
      const data = await response!.json();
      if (!response!.ok) throw new Error(data.error ?? 'Local AI could not write this line.');
      if (
        typeof data.line !== 'string' ||
        data.line.length < 8 ||
        data.line.length > 320 ||
        ![
          'neutral',
          'happy',
          'smug',
          'angry',
          'shocked',
          'crying',
          'suspicious',
          'victorious',
        ].includes(data.emotion) ||
        data.source !== 'local-ai'
      )
        throw new Error('Local AI returned an invalid response.');
      controller.signal.throwIfAborted();
      entry.done = true;
      return data as DialogueResult;
    })().catch((error) => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, entry);
    while (this.entries.size > 8) {
      const first = this.entries.keys().next().value!;
      this.entries.get(first)?.controller.abort();
      this.entries.delete(first);
    }
    return entry.promise;
  }
  retain(key: string) {
    for (const [id, entry] of this.entries)
      if (id !== key && !entry.done) {
        entry.controller.abort();
        this.entries.delete(id);
      }
  }
  cancelPending() {
    this.retain('');
  }
}
