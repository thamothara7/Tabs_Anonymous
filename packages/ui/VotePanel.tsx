import { ArrowRight, ArrowUpRight, Folder, Sparkles, Star, Undo2 } from 'lucide-react';
import type { Fate, GameState } from '../game-core/types';
export function VotePanel({
  state,
  paused,
  onDecide,
  onNext,
  onUndo,
  onFinish,
}: {
  state: GameState;
  paused: boolean;
  onDecide: (id: string, fate: Fate) => void;
  onNext: () => void;
  onUndo: () => void;
  onFinish: () => void;
}) {
  const selected = state.characters.find((c) => c.id === state.selected)!;
  const kept = state.characters.filter((c) => c.fate === 'keep').length;
  const remaining = state.characters.filter((c) => c.fate === 'undecided').length;
  return (
    <section
      className="vote-panel vote-sidebar"
      aria-label="Choose tab fate"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          paused ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.target !== event.currentTarget
        )
          return;
        const fate = ({ '1': 'keep', '2': 'group', '3': 'retire' } as Record<string, Fate>)[
          event.key
        ];
        if (fate) {
          event.preventDefault();
          onDecide(selected.id, fate);
        }
        if (event.key.toLowerCase() === 'n' && remaining) {
          event.preventDefault();
          onNext();
        }
        if (event.key.toLowerCase() === 'z' && state.undoStack.length) {
          event.preventDefault();
          onUndo();
        }
      }}
    >
      <div className="vote-heading">
        <span className="eyebrow">YOUR VERDICT</span>
        <h3 title={selected.title}>{selected.name}</h3>
        <p>
          {remaining} of {state.characters.length} still undecided <span>· {kept}/6 kept</span>
        </p>
      </div>
      <div
        className="verdict-progress"
        role="progressbar"
        aria-label="Verdicts completed"
        aria-valuenow={state.characters.length - remaining}
        aria-valuemin={0}
        aria-valuemax={state.characters.length}
      >
        <i
          style={{
            width: `${((state.characters.length - remaining) / state.characters.length) * 100}%`,
          }}
        />
      </div>
      <div className="vote-zones">
        <button
          aria-label="Keep in the spotlight"
          data-fate="keep"
          aria-pressed={selected.fate === 'keep'}
          disabled={paused || (kept >= 6 && selected.fate !== 'keep')}
          onClick={() => onDecide(selected.id, 'keep')}
        >
          <Star size={18} />
          <span>
            <b>Keep in the spotlight</b>
            <small>{kept} / 6 seats filled</small>
          </span>
          <kbd>1</kbd>
        </button>
        <button
          aria-label="Find their people"
          data-fate="group"
          aria-pressed={selected.fate === 'group'}
          disabled={paused}
          onClick={() => onDecide(selected.id, 'group')}
        >
          <Folder size={18} />
          <span>
            <b>Find their people</b>
            <small>Group in the arena</small>
          </span>
          <kbd>2</kbd>
        </button>
        <button
          aria-label="Retire from arena"
          data-fate="retire"
          aria-pressed={selected.fate === 'retire'}
          disabled={paused}
          onClick={() => onDecide(selected.id, 'retire')}
        >
          <ArrowUpRight size={18} />
          <span>
            <b>Retire from arena</b>
            <small>Real tab stays open</small>
          </span>
          <kbd>3</kbd>
        </button>
      </div>
      <div className="vote-footer">
        <button
          className="button undo-verdict"
          aria-label="Undo last verdict"
          title="Undo last verdict"
          disabled={paused || !state.undoStack.length}
          onClick={onUndo}
        >
          <Undo2 size={16} />
          <span>Undo</span>
        </button>
        {remaining ? (
          <button className="button next-verdict" disabled={paused} onClick={onNext}>
            Next undecided <ArrowRight size={15} />
          </button>
        ) : (
          <button className="button orange next-verdict" disabled={paused} onClick={onFinish}>
            The awards ceremony <Sparkles size={16} />
          </button>
        )}
      </div>
      <p className="vote-hint">
        Select a tab or drop it here. Focus this panel for keys 1–3, N for next, Z to undo.
      </p>
    </section>
  );
}
