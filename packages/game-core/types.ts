export type Category =
  'code' | 'video' | 'study' | 'shopping' | 'social' | 'events' | 'design' | 'other';
export type Emotion =
  'neutral' | 'happy' | 'smug' | 'angry' | 'shocked' | 'crying' | 'suspicious' | 'victorious';
export type Fate = 'undecided' | 'keep' | 'group' | 'retire';
export interface TabFact {
  id: string;
  title: string;
  url: string;
  category: Category;
  pinned: boolean;
  audible: boolean;
  protected: boolean;
  browserId?: number;
  windowId?: number;
}
export interface Character extends TabFact {
  name: string;
  color: string;
  symbol: string;
  role: string;
  emotion: Emotion;
  loyalty: number;
  confidence: number;
  fate: Fate;
  allies: string[];
  grudges: string[];
}
export type Cue =
  | 'entrance'
  | 'talk'
  | 'duplicate'
  | 'betrayal'
  | 'popcorn'
  | 'vote'
  | 'victory'
  | 'retire'
  | 'group'
  | 'angry';
export interface Beat {
  speaker: string;
  line: string;
  cue: Cue;
  duration: number;
  target?: string;
  label: string;
}
export interface GameState {
  characters: Character[];
  phase: 'lobby' | 'playing' | 'voting' | 'results';
  beat: number;
  selected: string;
  seed: number;
  seenDuplicates: boolean;
  actionLine: string | null;
  actionCue: Cue | null;
  actionSerial: number;
  actionTarget: string | null;
  undoStack: { id: string; fate: Fate; emotion: Emotion }[];
  defended: string[];
  decisions: number;
  history: string[];
}
export type GameAction =
  | { type: 'START' }
  | { type: 'NEXT' }
  | { type: 'SELECT'; id: string }
  | { type: 'DEFEND' | 'CHALLENGE' | 'SPEAK' | 'ROAST'; id: string }
  | { type: 'DECIDE'; id: string; fate: Fate }
  | { type: 'FINISH' }
  | { type: 'UNDO_DECISION' }
  | { type: 'RESET'; characters: Character[] }
  | { type: 'CLEAR_REACTION' };
