import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronRight,
  CircleHelp,
  Folder,
  Heart,
  ListFilter,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { demoCharacters } from '../game-core/fixtures';
import { categoryNames, duplicateGroups } from '../game-core/classify';
import { storyFor } from '../game-core/events';
import { endingFor, initialState, MAX_KEEP, reducer } from '../game-core/reducer';
import type { Character, Fate } from '../game-core/types';
import { AnimationDirector } from '../animation/director';
import { TabCharacter } from './TabCharacter';
import { TherapyArena } from './TherapyArena';

function readPreference(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
}
export function App({
  cast = demoCharacters,
  realMode = false,
  integration,
}: {
  cast?: Character[];
  realMode?: boolean;
  integration?: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, cast, initialState);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() =>
    readPreference(
      'ta-motion-reduced',
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  );
  const [sound, setSound] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [modal, setModal] = useState<'privacy' | 'connect' | 'help' | null>(null);
  const [toast, setToast] = useState('');
  const [rosterOpen, setRosterOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const director = useRef(new AnimationDirector());
  const audio = useRef<AudioContext | null>(null);

  const deck = useMemo(() => storyFor(cast, state.seed), [cast, state.seed]);
  const beat = deck[state.beat];
  const selected = state.characters.find((c) => c.id === state.selected) ?? state.characters[0];
  const duplicates = duplicateGroups(cast);
  const active = state.phase === 'playing' || state.phase === 'voting';
  const line =
    state.actionLine ??
    (state.phase === 'voting'
      ? 'The floor is yours. Choose each tab’s fate. Nobody’s actual browser tab gets closed.'
      : (beat?.line ??
        `${cast.length} tabs walk into a support group. None of them think they’re the problem.`));
  const speakerId = state.actionLine ? state.selected : beat?.speaker;
  const speaker = state.characters.find((c) => c.id === speakerId);
  const cue = state.actionCue ?? beat?.cue ?? 'talk';
  const round = state.phase === 'results' || state.phase === 'voting' ? 3 : state.beat >= 5 ? 2 : 1;
  const kept = state.characters.filter((c) => c.fate === 'keep').length;
  const remaining = state.characters.filter((c) => c.fate === 'undecided').length;
  const ending = endingFor(state);
  useEffect(() => {
    const d = director.current;
    if (state.actionLine && active)
      d.play(4200, setElapsed, () => dispatch({ type: 'CLEAR_REACTION' }));
    else if (state.phase === 'playing' && beat)
      d.play(beat.duration, setElapsed, () => dispatch({ type: 'NEXT' }));
    else {
      d.cancelAll();
      setElapsed(10000);
    }
    return () => d.cancelAll();
  }, [state.phase, state.beat, state.actionSerial, state.actionLine, active, beat]);
  useEffect(() => {
    if (paused || modal) director.current.pause();
    else director.current.resume();
  }, [paused, modal]);
  useEffect(() => {
    try {
      localStorage.setItem('ta-motion-reduced', String(reduced));
    } catch {
      /* Storage is optional. */
    }
  }, [reduced]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!sound || !active || paused) return;
    const ctx = audio.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      cue === 'duplicate' ? 130 : cue === 'victory' ? 660 : 320,
      ctx.currentTime,
    );
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
    return () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }, [state.beat, state.actionSerial, sound, active, cue, paused]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  const select = (id: string) => dispatch({ type: 'SELECT', id });
  const decide = (id: string, fate: Fate) => {
    if (paused || modal) return;
    if (
      fate === 'keep' &&
      kept >= MAX_KEEP &&
      state.characters.find((c) => c.id === id)?.fate !== 'keep'
    ) {
      setToast('Six seats in the spotlight. Group or retire a kept tab to make room.');
      return;
    }
    dispatch({ type: 'DECIDE', id, fate });
  };
  const drop = (id: string, x: number, y: number) => {
    const zone = [...document.querySelectorAll<HTMLElement>('[data-fate]')].find((zone) => {
      const r = zone.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    if (zone) decide(id, zone.dataset.fate as Fate);
  };
  const restart = () => {
    setPaused(false);
    dispatch({ type: 'RESET', characters: cast });
  };
  const toggleSound = async () => {
    if (!sound) {
      audio.current ??= new AudioContext();
      await audio.current.resume();
    }
    setSound(!sound);
  };
  const downloadRecap = () => {
    const text = `TABS ANONYMOUS — FICTIONAL ARENA RECAP\n${ending.title}\n${ending.description}\n\n${state.characters.map((c) => `${c.name}: ${c.fate}`).join('\n')}\n\nNo browser tabs were closed.\nSeed: ${state.seed}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tabs-anonymous-recap.txt';
    link.click();
    URL.revokeObjectURL(url);
    setToast('Your fictional recap has been downloaded.');
  };
  return (
    <div
      className={`app ${dragging ? 'is-dragging' : ''} ${reduced ? 'reduced-motion' : ''} ${paused || modal ? 'is-paused' : ''}`}
    >
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (state.phase === 'results') restart();
          }}
          aria-label="Tabs Anonymous home"
        >
          <div className="brand-icon">
            <span />
            <span />
            <i />
          </div>
          <span>
            TABS
            <br />
            ANONYMOUS
          </span>
        </a>
        <nav aria-label="Session progress" className="session-nav">
          {['The waiting room', 'Group therapy', 'The verdict'].map((label, i) => (
            <span
              key={label}
              className={
                (state.phase === 'lobby' ? 0 : state.phase === 'results' ? 2 : 1) === i
                  ? 'current'
                  : ''
              }
            >
              <b>0{i + 1}</b>
              {label}
              {i < 2 && <ChevronRight size={13} />}
            </span>
          ))}
        </nav>
        <div className="top-actions">
          <span className="demo-badge">
            <i />
            {realMode ? 'REAL TABS' : 'DEMO MODE'}
          </span>
          <button className="icon-button" aria-label="How to play" onClick={() => setModal('help')}>
            <CircleHelp size={19} />
          </button>
          <button className="button connect-button" onClick={() => setModal('connect')}>
            {realMode ? 'Tab permissions' : 'Use my real tabs'}
            <ArrowUpRight size={14} />
          </button>
        </div>
      </header>
      <main>
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <span /> A LITTLE LESS RAM. A LOT MORE DRAMA.
            </div>
            <h1>
              {state.phase === 'results' ? (
                'Closure looks good on you.'
              ) : (
                <>
                  Too many tabs.<em> Too many feelings.</em>
                </>
              )}
            </h1>
            <p>
              {state.phase === 'results'
                ? 'The meeting is over. The emotional processing is absolutely not.'
                : 'Your browser called an intervention. You’re the moderator.'}
            </p>
          </div>
          <div className="session-ticket">
            <span>SESSION № 001</span>
            <b>{state.phase === 'results' ? 'MEETING ADJOURNED' : 'LAST TAB STANDING'}</b>
            <span>
              <i /> {realMode ? 'LOCAL & PRIVATE' : 'A FICTIONAL TAB DRAMA'}
            </span>
          </div>
        </section>
        {state.phase === 'results' ? (
          <section className="results" aria-label="Session results">
            <div className="results-art">
              <span className="eyebrow">THE UNOFFICIAL TAB AWARDS</span>
              <div className="trophy">✶</div>
              <h2>{ending.title}</h2>
              <p>{ending.description}</p>
              <div className="award-cast">
                {state.characters
                  .filter((c) => c.fate === 'keep')
                  .slice(0, 6)
                  .map((c) => (
                    <TabCharacter key={c.id} character={c} emotion="victorious" />
                  ))}
              </div>
              <div className="result-stats">
                <span>
                  <b>{kept}</b>kept in the spotlight
                </span>
                <span>
                  <b>{state.characters.filter((c) => c.fate === 'group').length}</b>found their
                  people
                </span>
                <span>
                  <b>{state.characters.filter((c) => c.fate === 'retire').length}</b>chilling in the
                  balcony
                </span>
              </div>
              <div className="result-actions">
                <button className="button orange" onClick={downloadRecap}>
                  <ArrowDownToLine size={17} /> Save recap
                </button>
                <button className="button" onClick={restart}>
                  <RotateCcw size={16} /> Another session
                </button>
              </div>
              <small>Fictional comedy awards. Zero tabs closed.</small>
            </div>
            <div className="result-groups">
              <div className="eyebrow">
                {realMode ? 'YOUR ARENA DECISIONS' : 'YOUR MAKE-BELIEVE TAB GROUPS'}
              </div>
              <h3>A place for every personality.</h3>
              {Object.entries(categoryNames).map(([category, name]) => {
                const tabs = state.characters.filter(
                  (c) => c.category === category && c.fate !== 'retire',
                );
                return (
                  tabs.length > 0 && (
                    <div className="group-result" key={category}>
                      <Folder size={21} style={{ color: tabs[0].color }} />
                      <div>
                        <b>{name}</b>
                        <p>{tabs.map((c) => c.name).join(' · ')}</p>
                      </div>
                      <span>{tabs.length}</span>
                    </div>
                  )
                );
              })}
              {integration}
              <p className="safe-note">
                <ShieldCheck size={16} />
                {realMode
                  ? 'Real grouping requires a separate preview and approval.'
                  : 'These groups are fictional. Your real browser hasn’t been touched.'}
              </p>
            </div>
          </section>
        ) : (
          <section className="workspace">
            <div className="arena-panel">
              <div className="browser-strip">
                <div className="window-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="fake-tabs" aria-label="Fictional browser tabs">
                  {state.characters.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => select(c.id)}
                      className={selected?.id === c.id ? 'chosen' : ''}
                    >
                      <i style={{ background: c.color }}>
                        {c.category === 'shopping' ? '$' : c.symbol}
                      </i>
                      <span>{c.name}</span>
                      <span className="fake-close">×</span>
                    </button>
                  ))}
                </div>
                <span className="more-tabs">+{Math.max(0, state.characters.length - 6)}</span>
                <button
                  className="icon-button"
                  aria-label="Show all characters"
                  onClick={() => setRosterOpen(!rosterOpen)}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <TherapyArena
                state={state}
                beat={beat}
                cue={cue}
                reduced={reduced}
                paused={paused || !!modal}
                onSelect={select}
                onStart={() => dispatch({ type: 'START' })}
                onDrop={drop}
                onDragChange={setDragging}
              />
              <div className="caption-panel">
                <div className="caption-avatar">
                  {speaker ? (
                    <TabCharacter character={speaker} compact />
                  ) : (
                    <AudioLines size={27} />
                  )}
                </div>
                <div className="caption-copy">
                  <div className="caption-speaker">
                    {state.phase === 'lobby'
                      ? 'YOUR SESSION IS READY'
                      : (speaker?.name ?? 'THE THERAPIST')}
                    <span>
                      {state.phase === 'lobby'
                        ? 'TAKE A BREATH. THEN PRESS PLAY.'
                        : state.actionLine
                          ? 'UNSCRIPTED FEELINGS'
                          : (beat?.label ?? 'THE FINAL SAY')}
                    </span>
                  </div>
                  <p aria-hidden="true">
                    “
                    {reduced ||
                    state.phase === 'lobby' ||
                    (state.phase === 'voting' && !state.actionLine)
                      ? line
                      : line.slice(0, Math.floor(elapsed / 23))}
                    ”
                  </p>
                  <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {speaker?.name ?? 'Therapist'}: {line}
                  </p>
                </div>
                <span className="caption-on">CC</span>
              </div>
              <div className="playback">
                <div className="playback-left">
                  <button
                    className="icon-button"
                    disabled={!active}
                    onClick={() => setPaused(!paused)}
                    aria-label={paused ? 'Resume session' : 'Pause session'}
                  >
                    {paused ? <Play size={17} /> : <Pause size={17} />}
                  </button>
                  <button
                    className="icon-button"
                    disabled={state.phase !== 'playing' && !state.actionLine}
                    onClick={() => director.current.skipCurrent()}
                    aria-label="Skip scene"
                  >
                    <SkipForward size={17} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={state.phase === 'lobby'}
                    onClick={restart}
                    aria-label="Restart session"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <span className="playback-divider" />
                  <button
                    className="text-control"
                    onClick={() => void toggleSound()}
                    aria-pressed={sound}
                  >
                    {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span>Sound {sound ? 'on' : 'off'}</span>
                  </button>
                  <button
                    className={`text-control motion-toggle ${reduced ? 'on' : ''}`}
                    onClick={() => setReduced(!reduced)}
                    aria-label={reduced ? 'Reduced motion' : 'Full motion'}
                    aria-pressed={reduced}
                  >
                    <Zap size={15} />
                    <span>{reduced ? 'Reduced motion' : 'Full motion'}</span>
                  </button>
                </div>
                <div className="round-progress">
                  <span>
                    ROUND 0{round}
                    <small> / 03</small>
                  </span>
                  <div>
                    {[1, 2, 3].map((i) => (
                      <i className={i <= round ? 'filled' : ''} key={i} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <aside className="dossier">
              <div className="dossier-top">
                <span className="eyebrow">ON THE COUCH</span>
                <button
                  className="icon-button"
                  aria-label="Choose a character"
                  onClick={() => setRosterOpen(!rosterOpen)}
                >
                  <ListFilter size={18} />
                </button>
              </div>
              {selected && (
                <>
                  <div
                    className="portrait"
                    style={{ '--character-color': selected.color } as CSSProperties}
                  >
                    <span className="portrait-note">
                      {selected.pinned
                        ? 'has tenure.'
                        : selected.category === 'video'
                          ? '“just one more.”'
                          : 'seems well adjusted.'}
                    </span>
                    <TabCharacter character={selected} />
                    <span className="portrait-star">✳</span>
                  </div>
                  <div className="dossier-name">
                    <h2>{selected.name}</h2>
                    <span className="emotion-tag">{selected.emotion}</span>
                  </div>
                  <p className="character-role">{selected.role}</p>
                  <div className="character-facts">
                    <span>
                      <i style={{ background: selected.color }} />
                      {categoryNames[selected.category]}
                    </span>
                    {selected.pinned && <span>⌖ Pinned</span>}
                    {selected.audible && <span>♫ Audible</span>}
                  </div>
                  <div className="meters">
                    <div>
                      <span>
                        Faith in you <b>{selected.loyalty}%</b>
                      </span>
                      <div className="meter">
                        <i style={{ width: `${selected.loyalty}%`, background: '#88b39c' }} />
                      </div>
                    </div>
                    <div>
                      <span>
                        Main character energy <b>{selected.confidence}%</b>
                      </span>
                      <div className="meter">
                        <i style={{ width: `${selected.confidence}%`, background: '#c7b4de' }} />
                      </div>
                    </div>
                  </div>
                  <div className="evidence">
                    <span className="tiny-label">THE RECEIPTS</span>
                    <p>
                      {duplicates.some((g) => g.includes(selected.id)) ? (
                        <>
                          <span>◫</span> Shares an address with another tab.<b>Suspicious? Very.</b>
                        </>
                      ) : selected.pinned ? (
                        <>
                          <span>⌖</span> Pinned. Protected from real actions.
                          <b>“I’m literally management.”</b>
                        </>
                      ) : (
                        <>
                          <span>↳</span>
                          {realMode
                            ? new URL(selected.url).hostname
                            : 'Part of the fictional demo cast.'}
                          <b>
                            {selected.audible
                              ? 'Currently providing the soundtrack.'
                              : 'Has a lot of unprocessed potential.'}
                          </b>
                        </>
                      )}
                    </p>
                    {selected.allies.length > 0 && (
                      <small>♡ {selected.allies.length} allies in the productivity coalition</small>
                    )}
                  </div>
                  <div className="dossier-actions">
                    <button
                      className="button microphone"
                      disabled={!active || paused}
                      onClick={() => dispatch({ type: 'SPEAK', id: selected.id })}
                    >
                      <Mic size={16} /> Give them the microphone
                    </button>
                    <div>
                      <button
                        className="button"
                        disabled={!active || paused}
                        onClick={() => dispatch({ type: 'DEFEND', id: selected.id })}
                      >
                        <Heart size={15} /> Defend
                      </button>
                      <button
                        className="button"
                        disabled={!active || paused}
                        onClick={() => dispatch({ type: 'CHALLENGE', id: selected.id })}
                      >
                        <Zap size={15} /> Challenge
                      </button>
                    </div>
                  </div>
                </>
              )}
              <div className="dossier-foot">
                <span className="mini-live" />
                {state.phase === 'lobby'
                  ? 'Start therapy to hear their side.'
                  : 'Click any character to hear their side.'}
              </div>
            </aside>
          </section>
        )}
        {rosterOpen && state.phase !== 'results' && (
          <section className="roster" aria-label="All characters">
            <div>
              <b>The entire support group</b>
              <button
                className="icon-button"
                aria-label="Close character list"
                onClick={() => setRosterOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="roster-items">
              {state.characters.map((c) => (
                <button
                  key={c.id}
                  className={state.selected === c.id ? 'selected' : ''}
                  onClick={() => select(c.id)}
                >
                  <i style={{ background: c.color }} />
                  {c.name}
                  <small>{c.fate === 'undecided' ? c.role : c.fate}</small>
                </button>
              ))}
            </div>
          </section>
        )}
        {state.phase === 'voting' && (
          <section className="vote-panel" aria-label="Choose tab fate">
            <div className="vote-heading">
              <div className="eyebrow">THE FLOOR IS YOURS</div>
              <h3>What’s the verdict for {selected?.name}?</h3>
              <p>Drag a character here, or select one and use these buttons.</p>
            </div>
            <div className="vote-zones">
              <button
                data-fate="keep"
                disabled={paused}
                onClick={() => decide(state.selected, 'keep')}
              >
                <Star />
                <span>
                  <b>Keep in the spotlight</b>
                  <small>{kept} / 6 seats filled</small>
                </span>
              </button>
              <button
                data-fate="group"
                disabled={paused}
                onClick={() => decide(state.selected, 'group')}
              >
                <Folder />
                <span>
                  <b>Find their people</b>
                  <small>Group in the arena</small>
                </span>
              </button>
              <button
                data-fate="retire"
                disabled={paused}
                onClick={() => decide(state.selected, 'retire')}
              >
                <ArrowUpRight />
                <span>
                  <b>Retire from arena</b>
                  <small>A safe seat in the balcony</small>
                </span>
              </button>
            </div>
            <div className="vote-footer">
              <span>
                {remaining
                  ? `${remaining} tabs still need a verdict.`
                  : 'Everyone has a place. You did it.'}{' '}
                <b>All decisions are reversible before finishing.</b>
              </span>
              {remaining > 0 ? (
                <button
                  className="button"
                  disabled={paused}
                  onClick={() => select(state.characters.find((c) => c.fate === 'undecided')!.id)}
                >
                  Next undecided <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  className="button orange"
                  disabled={paused}
                  onClick={() => dispatch({ type: 'FINISH' })}
                >
                  The awards ceremony <Sparkles size={16} />
                </button>
              )}
            </div>
          </section>
        )}
        {state.phase !== 'results' && state.phase !== 'voting' && (
          <div className="below-stage">
            <p>
              <ShieldCheck size={15} />
              {realMode
                ? 'Local tab metadata. No page contents. No automatic closing.'
                : 'These are pretend tabs. Your real ones are safe. Probably judging you, but safe.'}
            </p>
            <span>*a little judgment</span>
          </div>
        )}
      </main>
      <footer className="footer">
        <span>A SMALL INTERVENTION FOR YOUR INTERNET HABITS.</span>
        <div>
          <button onClick={() => setModal('privacy')}>Privacy, please</button>
          <i>·</i>
          <span>
            Made with too many tabs open <span className="heart">♡</span>
          </span>
        </div>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal && <InfoModal kind={modal} realMode={realMode} onClose={() => setModal(null)} />}
    </div>
  );
}
function InfoModal({
  kind,
  realMode,
  onClose,
}: {
  kind: 'privacy' | 'connect' | 'help';
  realMode: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="info-modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div>
        <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
        <span className="eyebrow">TABS ANONYMOUS</span>
        <h2>
          {kind === 'privacy'
            ? 'Your tabs. Your business.'
            : kind === 'connect'
              ? 'Bring your own baggage.'
              : 'Welcome to the support group.'}
        </h2>
        {kind === 'privacy' ? (
          <>
            <p>
              The demo uses fictional tab data and runs entirely in your browser. No accounts,
              analytics, AI requests, or page scraping. Your motion preference stays on this device.
            </p>
            <p>
              The optional extension reads tab titles, URLs, pinned state, and audible state only
              after you grant permission. It processes these locally and excludes private windows,
              pinned tabs, and internal pages from grouping.
            </p>
            <p>
              Arena retirements are fiction. Real tab grouping requires a separate preview and an
              explicit Apply. This app never closes browser tabs.
            </p>
          </>
        ) : kind === 'connect' ? (
          <>
            <p>
              {realMode
                ? 'You’re already in the local extension. Finish the session to preview native tab groups.'
                : 'Real tabs mode runs in the included Chrome extension. The website cannot read your open tabs.'}
            </p>
            {!realMode && (
              <ol>
                <li>
                  From the repository, run <code>npm install</code> and{' '}
                  <code>npm run build:extension</code>.
                </li>
                <li>
                  Open <code>chrome://extensions</code> and enable Developer mode.
                </li>
                <li>
                  Choose “Load unpacked” and select <code>dist-extension</code>.
                </li>
                <li>Click the extension, then “Connect this window” to grant access.</li>
              </ol>
            )}
            <p className="safe-note">
              <ShieldCheck size={18} />
              Only local metadata. No browsing history. No automatic tab closing.
            </p>
          </>
        ) : (
          <>
            <p>
              Start therapy and watch your tabs work through their feelings. The story plays
              automatically, with captions and sound off by default.
            </p>
            <ol>
              <li>Select any character to see their dossier.</li>
              <li>
                Defend, challenge, or give them the microphone. Their trust and reactions change.
              </li>
              <li>
                In the final round, choose Keep, Group, or Retire for every tab. Six can keep the
                spotlight.
              </li>
              <li>Finish the session to discover your fictional award.</li>
            </ol>
            <p>
              Pause or skip a scene anytime. Buttons provide the same choices as dragging. Reduced
              motion keeps all choices and captions.
            </p>
          </>
        )}
        <button className="button orange" onClick={onClose}>
          Got it <ArrowRight size={16} />
        </button>
      </div>
    </dialog>
  );
}
