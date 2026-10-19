import { useEffect, useRef, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, CirclePlay, Grip, Mic } from 'lucide-react';
import { TabCharacter } from './TabCharacter';
import type { Beat, Character, Cue, GameState } from '../game-core/types';
const seats = [
  [24, 46, 1],
  [72, 47, 1.03],
  [48, 33, 0.86],
  [19, 70, 1.08],
  [77, 72, 1.08],
  [48, 78, 1.12],
  [10, 30, 0.65],
  [87, 30, 0.65],
  [29, 25, 0.62],
  [67, 25, 0.62],
  [7, 51, 0.68],
  [92, 51, 0.68],
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
  const actorIndex = state.characters.findIndex((c) => c.id === acting);
  const actorSeat = seats[Math.max(0, actorIndex)] ?? seats[0];
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
      <div className="exit-sign">ESC ↗</div>
      <div className="room-board">
        <span>today’s agenda</span>
        <b>let. it. go.</b>
        <i>↳ emotionally, at least.</i>
        <div className="board-doodle">♡</div>
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
      <div className={`productivity-sign ${cue === 'popcorn' ? 'fallen' : ''}`}>PRODUCTIVITY ↑</div>
      {!lobby && (
        <div className="stage-live">
          <i /> SESSION IN PROGRESS <span>● REC</span>
        </div>
      )}
      {!lobby && state.characters.some((c) => c.fate === 'retire') && (
        <div className="balcony">
          <span>THE SAFE BALCONY · STILL OPEN IN REAL LIFE</span>
        </div>
      )}
      {!lobby &&
        state.characters.map((character, index) => {
          const [seatX, seatY, seatScale] = seats[index % seats.length];
          const selected = state.selected === character.id;
          const speaking = acting === character.id;
          const retired = character.fate === 'retire';
          const grouped = character.fate === 'group';
          const balconyIndex = state.characters
            .filter((c) => c.fate === 'retire')
            .findIndex((c) => c.id === character.id);
          let [x, y, scale] = retired
            ? [17 + balconyIndex * 6, 16, 0.38]
            : [seatX, seatY, seatScale];
          if (
            !retired &&
            cue === 'duplicate' &&
            [beat?.speaker, beat?.target].includes(character.id)
          ) {
            x = character.id === beat?.speaker ? 37 : 63;
            y = 58;
            scale = 1.1;
          } else if (!retired && character.allies.length && !reduced) x += x < 48 ? 2 : -2;
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
                          ? '♡'
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
                        ? '♡'
                        : '?!'}
                  </span>
                )}
                <span className="character-name">
                  {character.name}
                  {character.fate !== 'undecided' && (
                    <small>
                      {character.fate === 'retire'
                        ? 'balcony'
                        : character.fate === 'group'
                          ? 'grouped'
                          : '★ safe'}
                    </small>
                  )}
                </span>
              </motion.button>
            </div>
          );
        })}
      {!lobby && actorIndex >= 0 && state.characters[actorIndex]?.fate !== 'retire' && (
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
            <small>~90 seconds · No sign-up · Mild emotional damage</small>
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
  );
}
