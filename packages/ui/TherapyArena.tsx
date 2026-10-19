import { useEffect, useRef, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, CirclePlay, Grip, Mic, Heart } from 'lucide-react';
import { shortTitle } from '../game-core/dialogue';
import { TabCharacter } from './TabCharacter';
import type { Beat, Character, Cue, GameState } from '../game-core/types';
const seats = [
  [14, 26, 0.67],
  [38, 26, 0.67],
  [62, 26, 0.67],
  [86, 26, 0.67],
  [14, 51, 0.8],
  [38, 51, 0.8],
  [62, 51, 0.8],
  [86, 51, 0.8],
  [14, 77, 0.9],
  [38, 77, 0.9],
  [62, 77, 0.9],
  [86, 77, 0.9],
];
export function TherapyArena({
  state,
  beat,
  cue,
  paused,
  reduced,
  onSelect,
  onStart,
  onDrop,
  onDragChange,
}: {
  state: GameState;
  beat?: Beat;
  cue: Cue;
  paused: boolean;
  reduced: boolean;
  onDragChange: (dragging: boolean) => void;
  onSelect: (id: string) => void;
  onStart: () => void;
  onDrop: (id: string, x: number, y: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lobby = state.phase === 'lobby';
  const acting = state.actionCue ? state.actionTarget : beat?.speaker;
  const onStage = state.characters.filter((c) => c.fate !== 'retire');
  const retiredCast = state.characters.filter((c) => c.fate === 'retire');
  const actorIndex = onStage.findIndex((c) => c.id === acting);
  const positionFor = (character: Character, index: number) => {
    if (cue === 'duplicate') {
      if ([beat?.speaker, beat?.target].includes(character.id))
        return [character.id === beat?.speaker ? 34 : 66, 53, 1.05];
      const spectators = onStage.filter((c) => ![beat?.speaker, beat?.target].includes(c.id));
      const j = spectators.findIndex((c) => c.id === character.id);
      return [10 + (j % 5) * 20, j < 5 ? 23 : 84, 0.52];
    }
    if (onStage.length <= 4) return [50 + (index - (onStage.length - 1) / 2) * 23, 56, 1];
    return seats[index % seats.length];
  };
  const actorSeat = actorIndex >= 0 ? positionFor(onStage[actorIndex], actorIndex) : [50, 50, 1];
  const previousMic = useRef(actorSeat);
  const fromMic = previousMic.current;
  useEffect(() => {
    previousMic.current = actorSeat;
  }, [acting]);
  const reactionIds = [
    beat?.target,
    state.characters.find((c) => c.id !== acting && c.allies.includes(acting ?? ''))?.id,
  ]
    .filter(Boolean)
    .slice(0, 2);
  return (
    <>
      <div
        ref={stageRef}
        className={`theater ${lobby ? 'is-lobby' : ''} cue-${cue} ${paused ? 'is-paused' : ''}`}
        data-testid="theater"
      >
        <div className="room-grain" />
        <div className="room-lamp">
          <span />
          <i />
        </div>
        <div className="wall-sign">
          <span>TA</span>
          <div>
            ONE TAB AT A TIME.<small>EST. FIVE MINUTES AGO</small>
          </div>
        </div>
        <div className="exit-sign">
          ESC <ArrowUpRight size={12} />
        </div>
        <div className="room-board">
          <span>today’s agenda</span>
          <b>let. it. go.</b>
          <i>↳ emotionally, at least.</i>
          <div className="board-doodle">
            <Heart size={24} />
          </div>
        </div>
        <div className="plant">
          <i />
          <i />
          <i />
          <i />
          <b />
        </div>
        <div className="floor" />
        <div className="rug">
          <span>TABS ANONYMOUS</span>
          <i>you can close this chapter.</i>
        </div>
        <div className={`productivity-sign ${cue === 'popcorn' ? 'fallen' : ''}`}>
          PRODUCTIVITY ↑
        </div>
        {!lobby && (
          <div className="stage-live">
            <i /> SESSION IN PROGRESS <span>● REC</span>
          </div>
        )}
        {!lobby && !onStage.length && (
          <div className="empty-stage">
            <b>The balcony is sold out.</b>
            <p>The room is quiet. Suspiciously quiet.</p>
            <small>Select someone below to change their verdict, or head to the awards.</small>
          </div>
        )}
        {!lobby &&
          onStage.map((character, index) => {
            const [x, y, scale] = positionFor(character, index);
            const selected = state.selected === character.id;
            const speaking = acting === character.id;
            const retired = character.fate === 'retire';
            const grouped = character.fate === 'group';
            const reacts =
              !state.actionCue && reactionIds.includes(character.id) && character.id !== acting;
            const style = {
              '--seat-scale': scale,
              '--cast-delay': `${index * 110}ms`,
              '--tab-color': character.color,
              left: `${x}%`,
              top: `${y}%`,
            } as CSSProperties;
            return (
              <div
                key={character.id}
                className={`seat ${selected ? 'selected' : ''} ${speaking ? 'has-mic' : ''} ${retired ? 'retired' : ''} ${grouped ? 'grouped' : ''} ${reacts ? 'secondary-reaction' : ''}`}
                style={style}
              >
                <div className="chair">
                  <i />
                  <b />
                </div>
                {speaking && <div className="speaker-glow" />}
                <motion.button
                  className={`character ${state.phase === 'playing' && state.beat === 0 ? 'entered' : ''} ${speaking ? `acting-${cue}` : ''}`}
                  aria-label={`Select ${character.name}`}
                  aria-pressed={selected}
                  title={character.title}
                  onClick={() => onSelect(character.id)}
                  drag={state.phase === 'voting' && !paused && !reduced}
                  dragSnapToOrigin
                  dragMomentum={false}
                  onDragStart={() => onDragChange(true)}
                  onDragEnd={(_, info) => {
                    onDrop(
                      character.id,
                      info.point.x - window.scrollX,
                      info.point.y - window.scrollY,
                    );
                    onDragChange(false);
                  }}
                  whileDrag={{ scale: 1.1, zIndex: 100 }}
                  style={{ touchAction: state.phase === 'voting' ? 'none' : 'auto' }}
                >
                  <TabCharacter
                    character={character}
                    speaking={speaking && (!state.actionCue || cue === 'talk')}
                    gaze={speaking ? 0 : Math.sign(actorSeat[0] - x)}
                  />
                  {speaking && (
                    <span className="reaction-badge">
                      {cue === 'duplicate'
                        ? '?!'
                        : cue === 'retire'
                          ? 'WHY'
                          : cue === 'victory'
                            ? '+'
                            : cue === 'angry'
                              ? '!!'
                              : cue === 'group'
                                ? '↳'
                                : '•••'}
                    </span>
                  )}
                  {reacts && (
                    <span className="listening-reaction" aria-hidden="true">
                      {character.emotion === 'angry'
                        ? '!!'
                        : character.allies.includes(acting ?? '')
                          ? '+'
                          : '?!'}
                    </span>
                  )}
                  <span className="character-name">
                    {shortTitle(character, 29)}
                    {character.fate !== 'undecided' && (
                      <small>
                        {character.fate === 'retire'
                          ? 'balcony'
                          : character.fate === 'group'
                            ? 'grouped'
                            : 'kept'}
                      </small>
                    )}
                  </span>
                </motion.button>
              </div>
            );
          })}
        {!lobby && actorIndex >= 0 && onStage[actorIndex]?.fate !== 'retire' && (
          <div
            key={acting}
            className="stage-mic"
            aria-hidden="true"
            style={
              {
                left: `${actorSeat[0]}%`,
                top: `${actorSeat[1]}%`,
                '--mic-from-x': `${fromMic[0] - actorSeat[0]}cqw`,
                '--mic-from-y': `${(fromMic[1] - actorSeat[1]) * 4}px`,
              } as CSSProperties
            }
          >
            <Mic size={20} />
          </div>
        )}
        {lobby && (
          <>
            <div className="lobby-cast">
              {state.characters.slice(0, 5).map((c, i) => (
                <div
                  key={c.id}
                  style={{ '--preview-index': i, '--tab-color': c.color } as CSSProperties}
                >
                  <TabCharacter
                    character={c}
                    emotion={
                      (
                        [
                          'suspicious',
                          'happy',
                          'shocked',
                          'smug',
                          'neutral',
                        ] as Character['emotion'][]
                      )[i]
                    }
                  />
                </div>
              ))}
            </div>
            <div className="lobby-invite">
              <span className="pill">A SUPPORT GROUP. SORT OF.</span>
              <h2>
                Your tabs have
                <br />a lot to unpack.
              </h2>
              <p>
                They’ve formed alliances. They have receipts.
                <br />
                And they’d like a word with you.
              </p>
              <button className="button orange start-button" onClick={onStart}>
                <CirclePlay size={19} /> Start therapy <ArrowUpRight size={17} />
              </button>
              <small>~2 minutes · No sign-up · Mild emotional damage</small>
            </div>
          </>
        )}
        {!lobby && cue === 'duplicate' && (
          <div className="duplicate-stamp" key={`duplicate-${state.beat}`}>
            DUPLICATE<span>same URL. different excuses.</span>
          </div>
        )}
        {!lobby && cue === 'popcorn' && (
          <div className="popcorn" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties}>
                ✦
              </i>
            ))}
          </div>
        )}
        {!lobby && cue === 'victory' && (
          <div className="confetti" key={state.actionSerial} aria-hidden="true">
            {Array.from({ length: 15 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        )}
        <div className="stage-bottom">
          <span>
            <i />{' '}
            {lobby
              ? 'THE WAITING ROOM'
              : cue === 'duplicate'
                ? 'EVIDENCE HAS ENTERED THE CHAT'
                : state.phase === 'voting'
                  ? 'YOUR ROOM. YOUR RULES.'
                  : 'EVERY FEELING IS VALID. EVERY TAB? DEBATABLE.'}
          </span>
          <span>
            <Grip size={12} /> {state.characters.length} seats · 0 judgment*
          </span>
        </div>
      </div>
      {!lobby && retiredCast.length > 0 && (
        <section className="balcony-tray" aria-label="Retired cast">
          <div className="balcony-heading">
            <b>THE BALCONY · {retiredCast.length}</b>
            <span>Still open in your browser. Still judging.</span>
          </div>
          <div className="balcony-cast">
            {retiredCast.map((c) => (
              <button
                key={c.id}
                className={state.selected === c.id ? 'selected' : ''}
                onClick={() => onSelect(c.id)}
                title={c.title}
                aria-label={`Select ${c.name}`}
                aria-pressed={state.selected === c.id}
              >
                <TabCharacter character={c} compact />
                <span>{shortTitle(c, 32)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
