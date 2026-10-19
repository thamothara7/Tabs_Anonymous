import { confessionFor } from './dialogue';
import { storyFor } from './events';
import { duplicateGroups } from './classify';
import type { Character, GameAction, GameState } from './types';
export const MAX_KEEP = 6;
export function initialState(characters: Character[], seed = 42): GameState {
  return {
    characters: structuredClone(characters),
    phase: 'lobby',
    beat: -1,
    selected: characters[0]?.id ?? '',
    seed,
    seenDuplicates: false,
    actionLine: null,
    actionCue: null,
    actionSerial: 0,
    actionTarget: null,
    undoStack: [],
    defended: [],
    decisions: 0,
    history: [],
  };
}
export function reducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET') return initialState(action.characters, state.seed);
  if (action.type === 'SELECT')
    return state.characters.some((c) => c.id === action.id)
      ? { ...state, selected: action.id }
      : state;
  if (action.type === 'CLEAR_REACTION')
    return { ...state, actionLine: null, actionCue: null, actionTarget: null };
  if (action.type === 'UNDO_DECISION') {
    const last = state.undoStack.at(-1);
    if (state.phase !== 'voting' || !last) return state;
    const characters = state.characters.map((c) =>
      c.id === last.id ? { ...c, fate: last.fate, emotion: last.emotion } : c,
    );
    return {
      ...state,
      characters,
      selected: last.id,
      decisions: characters.filter((c) => c.fate !== 'undecided').length,
      undoStack: state.undoStack.slice(0, -1),
      actionLine: null,
      actionCue: null,
      actionTarget: null,
      history: [...state.history, 'Last verdict undone'],
    };
  }
  if (action.type === 'START')
    return state.phase === 'lobby' ? { ...state, phase: 'playing', beat: 0 } : state;
  if (action.type === 'NEXT') {
    if (state.phase !== 'playing') return state;
    const next = state.beat + 1;
    const deck = storyFor(state.characters, state.seed);
    if (next >= deck.length)
      return { ...state, phase: 'voting', actionLine: null, actionCue: null, actionTarget: null };
    const beat = deck[next];
    const pair = duplicateGroups(state.characters)[0] ?? [];
    const characters = state.characters.map((c) => {
      let updated: Character = { ...c, emotion: c.id === beat.speaker ? 'smug' : 'neutral' };
      if (beat.cue === 'duplicate' && pair.includes(c.id))
        updated = {
          ...updated,
          emotion: 'shocked',
          confidence: Math.max(0, c.confidence - 12),
          grudges: [...new Set([...c.grudges, ...pair.filter((id) => id !== c.id)])],
        };
      if (beat.cue === 'betrayal' && ['code', 'study', 'events', 'design'].includes(c.category))
        updated = {
          ...updated,
          emotion: 'happy',
          allies: state.characters
            .filter(
              (t) => ['code', 'study', 'events', 'design'].includes(t.category) && t.id !== c.id,
            )
            .map((t) => t.id),
        };
      if (beat.target === c.id && beat.cue === 'betrayal') updated.emotion = 'angry';
      if (beat.cue === 'popcorn') updated.emotion = c.category === 'video' ? 'happy' : 'shocked';
      return updated;
    });
    return {
      ...state,
      beat: next,
      characters,
      seenDuplicates: state.seenDuplicates || beat.cue === 'duplicate',
      actionLine: null,
      actionCue: null,
      actionTarget: null,
      history: [...state.history, beat.label],
    };
  }
  if (action.type === 'FINISH') {
    if (state.phase !== 'voting' || state.characters.some((c) => c.fate === 'undecided'))
      return state;
    return { ...state, phase: 'results', actionLine: null, actionCue: null, actionTarget: null };
  }
  if (state.phase !== 'playing' && state.phase !== 'voting') return state;
  if (!('id' in action)) return state;
  const target = state.characters.find((c) => c.id === action.id);
  if (!target) return state;
  if (action.type === 'DECIDE') {
    if (state.phase !== 'voting' || action.fate === 'undecided' || target.fate === action.fate)
      return state;
    if (
      action.fate === 'keep' &&
      target.fate !== 'keep' &&
      state.characters.filter((c) => c.fate === 'keep').length >= MAX_KEEP
    )
      return state;
    const emotion =
      action.fate === 'keep' ? 'victorious' : action.fate === 'retire' ? 'crying' : 'happy';
    const cue = action.fate === 'keep' ? 'victory' : action.fate === 'retire' ? 'retire' : 'group';
    const lines = {
      keep: 'I knew you believed in me. I’ve prepared a forty-minute acceptance speech.',
      group: 'A folder? Finally. Some emotional structure.',
      retire: 'I WAS A VERY IMPORTANT TAB! …Is there Wi-Fi in the balcony?',
    };
    return {
      ...state,
      selected: target.id,
      actionTarget: target.id,
      characters: state.characters.map((c) =>
        c.id === target.id ? { ...c, fate: action.fate, emotion } : c,
      ),
      decisions: state.decisions + (target.fate === 'undecided' ? 1 : 0),
      actionCue: cue,
      actionSerial: state.actionSerial + 1,
      actionLine: lines[action.fate],
      undoStack: [
        ...state.undoStack,
        { id: target.id, fate: target.fate, emotion: target.emotion },
      ].slice(-60),
      history: [...state.history, `${target.name}: ${action.fate}`],
    };
  }
  if (action.type === 'SPEAK')
    return {
      ...state,
      selected: target.id,
      actionTarget: target.id,
      actionCue: 'talk',
      actionSerial: state.actionSerial + 1,
      actionLine: target.pinned
        ? 'I have tenure. You cannot fire tenure.'
        : target.audible
          ? 'I’m not interrupting. I’m providing the soundtrack to this meeting.'
          : confessionFor(target.category, state.actionSerial),
    };
  if (action.type === 'DEFEND' || action.type === 'CHALLENGE') {
    const defend = action.type === 'DEFEND';
    return {
      ...state,
      selected: target.id,
      actionTarget: target.id,
      characters: state.characters.map((c) =>
        c.id === target.id
          ? {
              ...c,
              emotion: defend ? 'victorious' : 'angry',
              loyalty: Math.min(100, Math.max(0, c.loyalty + (defend ? 15 : -12))),
              confidence: Math.min(100, Math.max(0, c.confidence + (defend ? 8 : -10))),
            }
          : c,
      ),
      defended: defend ? [...new Set([...state.defended, target.id])] : state.defended,
      actionLine: defend
        ? 'You defended me? I’m putting you in my acknowledgments. Right after the Wi-Fi.'
        : 'Objection! My lack of usefulness is a highly specialized feature.',
      actionCue: defend ? 'victory' : 'angry',
      actionSerial: state.actionSerial + 1,
    };
  }
  return state;
}
export function endingFor(state: GameState): { title: string; description: string } {
  const kept = state.characters.filter((c) => c.fate === 'keep');
  if (state.characters.some((c) => c.fate === 'retire' && state.defended.includes(c.id)))
    return {
      title: 'The Betrayer',
      description:
        'You gave them hope. Then you gave them a seat in the balcony. The tabs will remember this.',
    };
  if (
    kept.filter((c) => ['video', 'social', 'shopping'].includes(c.category)).length >
    kept.length / 2
  )
    return {
      title: 'Professional Procrastinator',
      description: 'Your priorities are questionable. Your entertainment lineup is impeccable.',
    };
  if (!state.characters.some((c) => c.fate === 'retire'))
    return {
      title: 'The Sentimental Organizer',
      description: 'Nobody left. They just have very organized feelings now.',
    };
  return {
    title: 'The Responsible Adult',
    description:
      'Some boundaries. A little chaos. For once, everybody knows which folder they belong in.',
  };
}
