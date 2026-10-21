import type { Character, Cue, Emotion } from '../game-core/types';
export const KOKORO_VOICES: CastVoice[] = [
  ['bm_george', 'George', 'Bold, grounded therapist'],
  ['af_heart', 'Heart', 'Warm and expressive'],
  ['af_bella', 'Bella', 'Bright and confident'],
  ['af_nicole', 'Nicole', 'Soft and conspiratorial'],
  ['af_sarah', 'Sarah', 'Clear and composed'],
  ['af_sky', 'Sky', 'Light and playful'],
  ['am_fenrir', 'Fenrir', 'Strong and dramatic'],
  ['am_michael', 'Michael', 'Measured and direct'],
  ['am_puck', 'Puck', 'Lively and mischievous'],
  ['bf_emma', 'Emma', 'Poised and articulate'],
  ['bf_isabella', 'Isabella', 'Calm and polished'],
  ['bm_fable', 'Fable', 'Storyteller'],
  ['bm_lewis', 'Lewis', 'Dry and understated'],
].map(([id, name, style]) => ({ id, name, labels: { style, engine: 'kokoro' } }));
export interface CastVoice {
  id: string;
  name: string;
  labels?: Record<string, string>;
}
export function autoCast(
  voices: CastVoice[],
  cast: Character[],
  therapistId?: string,
): Record<string, string> {
  const sorted = [...voices].sort((a, b) => a.id.localeCompare(b.id));
  const therapist =
    voices.find((v) => v.id === therapistId) ??
    voices.find((v) => v.id === 'bm_george') ??
    voices.find((v) =>
      /deep|authoritative|narrat|confident/i.test(v.name + JSON.stringify(v.labels)),
    ) ??
    sorted[0];
  if (!therapist) return {};
  const pool = sorted.filter((v) => v.id !== therapist.id);
  const preferred: Record<string, string[]> = {
    code: ['am_michael', 'bm_lewis'],
    video: ['am_puck', 'am_fenrir'],
    study: ['bf_emma', 'bf_isabella'],
    shopping: ['af_nicole', 'af_heart'],
    social: ['af_sky', 'am_puck'],
    events: ['bm_fable', 'am_fenrir'],
    design: ['af_bella', 'af_heart'],
    other: ['af_sarah', 'af_heart'],
  };
  const used = new Set<string>();
  const mapping: Record<string, string> = { therapist: therapist.id };
  for (const [i, c] of [...cast].sort((a, b) => a.id.localeCompare(b.id)).entries()) {
    const voice =
      pool.find((v) => !used.has(v.id) && preferred[c.category]?.includes(v.id)) ??
      pool.find((v) => !used.has(v.id)) ??
      pool[i % pool.length] ??
      therapist;
    mapping[c.id] = voice.id;
    used.add(voice.id);
  }
  return mapping;
}
export function deliveryFor(
  c: Character | undefined,
  cue: Cue,
): { emotion: Emotion; pitch: number; rate: number; label: string } {
  if (!c)
    return { emotion: 'neutral', pitch: 0.93, rate: 0.94, label: 'Grounded, confident therapist' };
  const emotion: Emotion =
    cue === 'retire'
      ? 'crying'
      : cue === 'victory'
        ? 'victorious'
        : cue === 'angry'
          ? 'angry'
          : cue === 'duplicate'
            ? 'shocked'
            : cue === 'popcorn'
              ? 'smug'
              : c.emotion;
  const profiles: Record<Emotion, [number, number, string]> = {
    neutral: [1, 1, 'Conversational'],
    happy: [1.04, 1.05, 'Warm and excited'],
    smug: [0.98, 0.96, 'Dry and sarcastic'],
    angry: [0.97, 1.06, 'Frustrated'],
    shocked: [1.07, 1.04, 'Surprised'],
    crying: [0.96, 0.9, 'Disappointed'],
    suspicious: [0.98, 0.94, 'Skeptical'],
    victorious: [1.04, 1.06, 'Triumphant'],
  };
  const [pitch, rate, label] = profiles[emotion];
  return { emotion, pitch, rate, label };
}
export const VOICE_SERVER = 'http://127.0.0.1:4317';
export function serviceHeaders(): Record<string, string> {
  return {
    'X-TA-Client': '1',
    ...(typeof chrome !== 'undefined' && chrome.runtime?.id
      ? { 'X-TA-Extension-ID': chrome.runtime.id }
      : {}),
  };
}
export async function ensureVoicePermission(): Promise<void> {
  if (
    typeof chrome !== 'undefined' &&
    chrome.permissions &&
    location.protocol === 'chrome-extension:'
  ) {
    if (!(await chrome.permissions.request({ origins: ['http://127.0.0.1/*'] })))
      throw new Error(
        'Localhost permission was not granted. Click Retry sound and allow access to 127.0.0.1.',
      );
  }
}
export async function connectKokoro(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const response = await fetch(`${VOICE_SERVER}/kokoro/voices`, {
    headers: serviceHeaders(),
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Local service returned ${response.status}.`);
  if (!KOKORO_VOICES.every((v) => data.voices?.some((item: CastVoice) => item.id === v.id)))
    throw new Error('Kokoro voices are missing. Run npm run voice:setup once.');
}

export function localConnectionError(error: unknown): string {
  if (error instanceof Error) {
    if (/gesture|permission/i.test(error.message))
      return 'Localhost access is blocked. Retry and allow access to 127.0.0.1 in the browser prompt.';
    if (error.name === 'TimeoutError')
      return 'Local startup timed out. Retry once the model finishes loading.';
    if (error instanceof TypeError)
      return 'Cannot reach the local service. Check localhost access in extension settings, or run npm run local:start.';
    if (/suspended|audio/i.test(error.message))
      return 'The browser could not enable audio. Unmute this tab and retry.';
    return error.message;
  }
  return 'Local connection failed. Retry to reconnect.';
}
