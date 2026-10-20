import type { Character, Cue, Emotion } from '../game-core/types';
export type VoiceMode = 'kokoro' | 'cloud' | 'local' | 'off';
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
export async function ensureVoicePermission(): Promise<void> {
  if (
    typeof chrome !== 'undefined' &&
    chrome.permissions &&
    location.protocol === 'chrome-extension:'
  ) {
    if (!(await chrome.permissions.request({ origins: ['http://127.0.0.1/*'] })))
      throw new Error('Local voice server permission was not granted.');
  }
}
export async function connectCloudVoices(
  engine: 'cloud' | 'kokoro' = 'cloud',
): Promise<CastVoice[]> {
  await ensureVoicePermission();
  const response = await fetch(`${VOICE_SERVER}${engine === 'kokoro' ? '/kokoro' : ''}/voices`, {
    headers: { 'X-TA-Client': '1' },
    signal: AbortSignal.timeout(120000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not connect to the voice server.');
  if (!data.voices?.length)
    throw new Error(
      engine === 'kokoro'
        ? 'Kokoro has no installed voices. Run npm run voice:setup.'
        : 'No ElevenLabs voices available. Add voices to your account.',
    );
  return data.voices;
}

export function loadVoiceCasting(engine: 'cloud' | 'kokoro' = 'cloud'): {
  voices: CastVoice[];
  map: Record<string, string>;
} {
  try {
    const data = JSON.parse(localStorage.getItem(`ta-${engine}-casting-v1`) ?? '{}');
    const voices: CastVoice[] = Array.isArray(data.voices)
      ? data.voices
          .filter((v: CastVoice) => typeof v?.id === 'string' && typeof v?.name === 'string')
          .slice(0, 100)
      : [];
    const ids = new Set(voices.map((v) => v.id));
    const map =
      data.map && typeof data.map === 'object'
        ? (Object.fromEntries(
            Object.entries(data.map).filter(
              ([key, value]) => key.length < 100 && typeof value === 'string' && ids.has(value),
            ),
          ) as Record<string, string>)
        : {};
    return { voices, map };
  } catch {
    return { voices: [], map: {} };
  }
}

export function previewLine(c: Character | undefined, emotion: Emotion): string {
  if (!c) return 'Welcome. Take a breath. I run this room, and every tab will get its turn.';
  const lines: Record<Emotion, string> = {
    neutral: 'I have a perfectly reasonable explanation. It just requires twelve more tabs.',
    happy: 'You picked me! I knew being open for three weeks would finally pay off!',
    smug: 'Of course I am essential. The other tabs are just here for emotional support.',
    angry: 'Excuse me! I was promised a productive afternoon. This is a hostage situation!',
    shocked: 'Wait. There is another copy of me? And you gave them a better seat?',
    crying: 'Fine. I will wait on the balcony. I even saved your place in the article.',
    suspicious: 'Interesting. You say you need me. Yet you cannot remember why you opened me.',
    victorious: 'Still standing! Put that on my resume. Right below professional distraction.',
  };
  return `${c.name}. ${lines[emotion]}`;
}
