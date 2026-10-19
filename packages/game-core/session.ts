import { initialState } from './reducer';
import type { Character, Emotion, Fate, GameState } from './types';
const VERSION = 2;
const MAX_AGE = 24 * 60 * 60 * 1000;
const emotions: Emotion[] = [
  'neutral',
  'happy',
  'smug',
  'angry',
  'shocked',
  'crying',
  'suspicious',
  'victorious',
];
const fates: Fate[] = ['undecided', 'keep', 'group', 'retire'];
export const sessionKey = (real: boolean) => (real ? 'ta-session-real-v2' : 'ta-session-demo-v2');
export function encodeSession(state: GameState, now = Date.now()): string {
  // A checkpoint contains game data only: never Chrome approvals or apply operations.
  return JSON.stringify({
    version: VERSION,
    savedAt: now,
    state: { ...state, actionLine: null, actionCue: null, actionTarget: null },
  });
}
export function decodeSession(
  raw: string | null,
  cast: Character[],
  now = Date.now(),
): GameState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (
      data.version !== VERSION ||
      !Number.isFinite(data.savedAt) ||
      now - data.savedAt > MAX_AGE ||
      data.savedAt > now + 60000
    )
      return null;
    const s = data.state;
    if (
      !s ||
      !['playing', 'voting', 'results'].includes(s.phase) ||
      !Number.isInteger(s.beat) ||
      s.beat < 0 ||
      s.beat > 9 ||
      !Number.isInteger(s.seed)
    )
      return null;
    if (!Array.isArray(s.characters) || s.characters.length !== cast.length || cast.length > 12)
      return null;
    const ids = new Set(cast.map((c) => c.id));
    const validIds = (value: unknown): value is string[] =>
      Array.isArray(value) &&
      value.length <= 12 &&
      value.every((id) => typeof id === 'string' && ids.has(id));
    if (!ids.has(s.selected) || !validIds(s.defended)) return null;
    const seen = new Set<string>();
    const characters = cast.map((c) => {
      const saved = s.characters.find((v: Character) => v?.id === c.id);
      if (
        !saved ||
        saved.url !== c.url ||
        seen.has(saved.id) ||
        !fates.includes(saved.fate) ||
        !emotions.includes(saved.emotion) ||
        !validIds(saved.allies) ||
        !validIds(saved.grudges)
      )
        throw new Error('Invalid character');
      for (const key of ['loyalty', 'confidence'] as const)
        if (!Number.isFinite(saved[key]) || saved[key] < 0 || saved[key] > 100)
          throw new Error('Invalid meter');
      seen.add(saved.id);
      return {
        ...c,
        fate: saved.fate,
        emotion: saved.emotion,
        loyalty: saved.loyalty,
        confidence: saved.confidence,
        allies: saved.allies,
        grudges: saved.grudges,
      };
    });
    if (
      characters.filter((c) => c.fate === 'keep').length > 6 ||
      (s.phase === 'results' && characters.some((c) => c.fate === 'undecided'))
    )
      return null;
    if (
      !Array.isArray(s.undoStack) ||
      s.undoStack.length > 60 ||
      s.undoStack.some(
        (v: { id: string; fate: Fate; emotion: Emotion }) =>
          !v || !ids.has(v.id) || !fates.includes(v.fate) || !emotions.includes(v.emotion),
      )
    )
      return null;
    return {
      ...initialState(cast, s.seed),
      characters,
      phase: s.phase,
      beat: s.beat,
      selected: s.selected,
      actionSerial:
        Number.isSafeInteger(s.actionSerial) && s.actionSerial >= 0 ? s.actionSerial : 0,
      history: Array.isArray(s.history)
        ? s.history
            .filter((line: unknown) => typeof line === 'string')
            .slice(-40)
            .map((line: string) => line.slice(0, 500))
        : [],
      defended: s.defended,
      seenDuplicates: s.seenDuplicates === true,
      undoStack: s.undoStack,
      decisions: characters.filter((c) => c.fate !== 'undecided').length,
    };
  } catch {
    return null;
  }
}
export function loadSession(cast: Character[], real: boolean): GameState | null {
  try {
    return decodeSession(sessionStorage.getItem(sessionKey(real)), cast);
  } catch {
    return null;
  }
}
export function saveSession(state: GameState, real: boolean): boolean {
  try {
    if (state.phase === 'lobby') sessionStorage.removeItem(sessionKey(real));
    else sessionStorage.setItem(sessionKey(real), encodeSession(state));
    return true;
  } catch {
    return false;
  }
}
