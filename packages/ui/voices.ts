import type { Character, Cue, Emotion } from '../game-core/types';
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
    voices.find((v) =>
      /deep|authoritative|narrat|confident/i.test(v.name + JSON.stringify(v.labels)),
    ) ??
    sorted[0];
  if (!therapist) return {};
  const pool = sorted.filter((v) => v.id !== therapist.id);
  return {
    therapist: therapist.id,
    ...Object.fromEntries(cast.map((c, i) => [c.id, (pool[i % pool.length] ?? therapist).id])),
  };
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
export async function connectCloudVoices(): Promise<CastVoice[]> {
  if (
    typeof chrome !== 'undefined' &&
    chrome.permissions &&
    location.protocol === 'chrome-extension:'
  ) {
    if (!(await chrome.permissions.request({ origins: ['http://127.0.0.1/*'] })))
      throw new Error('Local voice server permission was not granted.');
  }
  const response = await fetch(`${VOICE_SERVER}/voices`, {
    headers: { 'X-TA-Client': '1' },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not connect to the voice server.');
  if (!data.voices?.length)
    throw new Error('No ElevenLabs voices available. Add voices to your account.');
  return data.voices;
}

export function loadVoiceCasting(): { voices: CastVoice[]; map: Record<string, string> } {
  try {
    const data = JSON.parse(localStorage.getItem('ta-cloud-casting-v1') ?? '{}');
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
