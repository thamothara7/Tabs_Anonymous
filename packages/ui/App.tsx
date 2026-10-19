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
  Volume2,
  VolumeX,
  X,
  Zap,
  Trophy,
  MessageSquare,
  Star,
} from 'lucide-react';
import { demoCharacters } from '../game-core/fixtures';
import { categoryNames, duplicateGroups } from '../game-core/classify';
import { storyFor } from '../game-core/events';
import { endingFor, initialState, MAX_KEEP, reducer } from '../game-core/reducer';
import type { Character, Fate } from '../game-core/types';
import { AnimationDirector } from '../animation/director';
import { TabCharacter } from './TabCharacter';
import { recapSvg, recapText, downloadFile, downloadPng } from './recap';
import { votingLine } from '../game-core/dialogue';
import { SessionAudio, lineDuration } from './audio';
import { VoiceStudio } from './VoiceStudio';
import { autoCast, deliveryFor, loadVoiceCasting, type CastVoice } from './voices';
import { VotePanel } from './VotePanel';
import { loadSession, saveSession } from '../game-core/session';
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
  const [restored] = useState(() => loadSession(cast, realMode));
  const [state, dispatch] = useReducer(
    reducer,
    restored ?? initialState(cast, Math.floor(Date.now() / 1000) % 1000000),
  );
  const [paused, setPaused] = useState(restored?.phase === 'playing');
  const [saved, setSaved] = useState(false);
  const [showRestored, setShowRestored] = useState(!!restored);
  const [reduced, setReduced] = useState(() =>
    readPreference(
      'ta-motion-reduced',
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  );
  const [sound, setSound] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceMode, setVoiceMode] = useState<'cloud' | 'local' | 'off'>('cloud');
  const [savedCasting] = useState(loadVoiceCasting);
  const [cloudVoices, setCloudVoices] = useState<CastVoice[]>(savedCasting.voices);
  const [cloudMap, setCloudMap] = useState<Record<string, string>>(() => ({
    ...autoCast(savedCasting.voices, cast, savedCasting.map.therapist),
    ...Object.fromEntries(
      Object.entries(savedCasting.map).filter(
        ([id]) => id === 'therapist' || cast.some((c) => c.id === id),
      ),
    ),
  }));
  const [localMap, setLocalMap] = useState<Record<string, string>>({});
  const [voiceHold, setVoiceHold] = useState(false);
  const [replay, setReplay] = useState(0);
  const voiceMap = voiceMode === 'cloud' ? cloudMap : localMap;
  const voiceURI = voiceMode === 'off' ? 'off' : (voiceMap.therapist ?? '');
  const [volume, setVolume] = useState(65);
  const [audioMessage, setAudioMessage] = useState('Enable sound to hear the cast.');
  const [exporting, setExporting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [modal, setModal] = useState<'privacy' | 'connect' | 'help' | null>(null);
  const [toast, setToast] = useState('');
  const [rosterOpen, setRosterOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const director = useRef(new AnimationDirector());
  const wasPaused = useRef(false);
  const audio = useRef(new SessionAudio());

  const deck = useMemo(() => storyFor(cast, state.seed), [cast, state.seed]);
  const beat = deck[state.beat];
  const selected = state.characters.find((c) => c.id === state.selected) ?? state.characters[0];
  const duplicates = duplicateGroups(cast);
  const active = state.phase === 'playing' || state.phase === 'voting';
  const line =
    state.actionLine ??
    (state.phase === 'voting'
      ? votingLine(state)
      : (beat?.line ??
        `${cast.length} tabs walk into a support group. None of them think they’re the problem.`));
  const speakerId = state.actionLine
    ? state.actionCue === 'popcorn'
      ? 'therapist'
      : state.actionTarget
    : state.phase === 'voting'
      ? 'therapist'
      : beat?.speaker;
  const speaker = state.characters.find((c) => c.id === speakerId);
  const cue = state.actionCue ?? beat?.cue ?? 'talk';
  const round = state.phase === 'results' || state.phase === 'voting' ? 3 : state.beat >= 5 ? 2 : 1;
  const kept = state.characters.filter((c) => c.fate === 'keep').length;
  const remaining = state.characters.filter((c) => c.fate === 'undecided').length;
  const ending = endingFor(state);
  const nextUndecided = () => {
    const current = state.characters.findIndex((c) => c.id === state.selected);
    const ordered = [
      ...state.characters.slice(current + 1),
      ...state.characters.slice(0, current + 1),
    ];
    const next = ordered.find((c) => c.fate === 'undecided');
    if (next) dispatch({ type: 'SELECT', id: next.id });
  };
  useEffect(() => {
    setSaved(saveSession(state, realMode));
  }, [state, realMode]);
  useEffect(() => {
    const d = director.current;
    if (state.actionLine && active)
      d.play(lineDuration(line), setElapsed, () => dispatch({ type: 'CLEAR_REACTION' }));
    else if (state.phase === 'playing' && beat)
      d.play(Math.max(beat.duration, lineDuration(line)), setElapsed, () =>
        dispatch({ type: 'NEXT' }),
      );
    else {
      d.cancelAll();
      setElapsed(10000);
    }
    return () => d.cancelAll();
  }, [state.phase, state.beat, state.actionSerial, state.actionLine, active, beat, line]);
  useEffect(() => {
    const stopped = paused || !!modal || voiceHold;
    if (stopped) director.current.pause();
    else {
      // Speech restarts the current sentence after an interruption; give it a full beat.
      if (
        wasPaused.current &&
        voiceMode === 'local' &&
        sound &&
        voiceURI &&
        voiceURI !== 'off' &&
        active
      ) {
        director.current.play(lineDuration(line), setElapsed, () =>
          dispatch({ type: state.actionLine ? 'CLEAR_REACTION' : 'NEXT' }),
        );
      }
      director.current.resume();
    }
    wasPaused.current = stopped;
  }, [paused, modal, sound, voiceURI, active, line, state.actionLine, voiceHold, voiceMode]);
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
    const refresh = () => {
      const local = audio.current.voices();
      setVoices(local);
      setLocalMap((previous) =>
        Object.keys(previous).length
          ? previous
          : autoCast(
              local.map((v) => ({ id: v.voiceURI, name: v.name })),
              cast,
            ),
      );
    };
    refresh();
    if (typeof speechSynthesis !== 'undefined')
      speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => {
      if (typeof speechSynthesis !== 'undefined')
        speechSynthesis.removeEventListener('voiceschanged', refresh);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        'ta-cloud-casting-v1',
        JSON.stringify({ voices: cloudVoices, map: cloudMap }),
      );
    } catch {
      /* Optional preferences. */
    }
  }, [cloudVoices, cloudMap]);
  useEffect(() => {
    audio.current.volume = volume / 100;
  }, [volume]);
  useEffect(() => {
    const engine = audio.current;
    if (!sound || paused || modal) {
      engine.stop();
      return;
    }
    if (!active) return;
    engine.effect(cue);
    const assigned = voiceMap[speakerId ?? 'therapist'];
    const delivery = deliveryFor(speaker, cue);
    if (voiceMode === 'cloud') {
      if (!assigned) {
        setAudioMessage('Connect ElevenLabs in Audio settings to enable expressive speech.');
        return;
      }
      setVoiceHold(true);
      setAudioMessage(`Speaking: ${speaker?.name ?? 'The therapist'}. ${delivery.label}.`);
      void engine.speakCloud(
        line,
        assigned,
        delivery.emotion,
        !speaker,
        () => {
          setVoiceHold(false);
          if (state.phase === 'playing' || state.actionLine) director.current.skipCurrent();
        },
        (message) => {
          setVoiceHold(false);
          setAudioMessage(message);
        },
      );
    } else if (voiceMode === 'local' && assigned) {
      engine.speak(
        line,
        assigned,
        delivery.pitch,
        () => setAudioMessage('Device voice failed. Choose another voice or connect ElevenLabs.'),
        delivery.rate,
      );
    }
    return () => {
      engine.stop();
      setVoiceHold(false);
    };
  }, [
    state.phase,
    state.beat,
    state.actionSerial,
    sound,
    active,
    line,
    cue,
    paused,
    modal,
    voiceURI,
    voiceMode,
    voiceMap,
    replay,
    speakerId,
  ]);
  useEffect(() => () => audio.current.dispose(), []);
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
    setShowRestored(false);
    dispatch({ type: 'RESET', characters: cast });
  };
  const enableAudio = async () => {
    try {
      await audio.current.unlock();
      audio.current.effect('victory');
      setSound(true);
      setAudioMessage('Sound ready. Choose your voice cast below.');
      return true;
    } catch {
      setSound(false);
      setAudioMessage(
        'Audio could not start. Check the browser tab is unmuted, then try Test sound.',
      );
      setToast('Audio could not start. Open Audio settings to retry.');
      return false;
    }
  };
  const toggleSound = async () => {
    if (sound) {
      audio.current.stop();
      setSound(false);
    } else await enableAudio();
  };
  const downloadRecap = () => {
    downloadFile(recapText(state), 'tabs-anonymous-recap.txt', 'text/plain;charset=utf-8');
    setToast('Detailed recap saved. It includes tab titles; review it before sharing.');
  };
  const saveCard = async () => {
    setExporting(true);
    try {
      await downloadPng(recapSvg(state));
      setToast('PNG award card saved. No tab names or links included.');
    } catch {
      setToast('Could not create PNG. Use Save SVG instead.');
    } finally {
      setExporting(false);
    }
  };
  return (
    <div
      className={`app ${state.phase === 'voting' ? 'voting-mode' : ''} ${dragging ? 'is-dragging' : ''} ${reduced ? 'reduced-motion' : ''} ${paused || modal ? 'is-paused' : ''}`}
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
        {showRestored && state.phase !== 'lobby' && (
          <div className="resume-banner" role="status">
            <RotateCcw size={14} /> Session restored in this tab.{' '}
            {state.phase === 'playing' && paused
              ? 'Press Resume to continue the scene.'
              : 'Your decisions are still here.'}
          </div>
        )}
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
            <span>YOUR SUPPORT GROUP</span>
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
              <div className="trophy" aria-hidden="true">
                <Trophy size={78} strokeWidth={1.4} />
              </div>
              <h2>{ending.title}</h2>
              <p>{ending.description}</p>
              <div className="award-cast">
                {state.characters
                  .filter((c) => kept === 0 || c.fate === 'keep')
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
              <details className="share-preview">
                <summary>Preview share card</summary>
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(recapSvg(state))}`}
                  alt={`Share card: ${ending.title}. ${kept} kept, ${state.characters.filter((c) => c.fate === 'group').length} grouped, ${state.characters.filter((c) => c.fate === 'retire').length} retired.`}
                />
              </details>
              <div className="result-actions">
                <button
                  className="button orange"
                  onClick={() => void saveCard()}
                  disabled={exporting}
                >
                  <ArrowDownToLine size={17} /> {exporting ? 'Creating card…' : 'Save recap card'}
                </button>
                <button
                  className="button"
                  onClick={() =>
                    downloadFile(recapSvg(state), 'tabs-anonymous-award.svg', 'image/svg+xml')
                  }
                >
                  Save SVG
                </button>
                <button className="button" onClick={downloadRecap}>
                  Save text recap
                </button>
                <button className="button" onClick={restart}>
                  <RotateCcw size={16} /> Another session
                </button>
              </div>
              <small>
                PNG / SVG: no browsing details. Text recap: includes tab titles and session
                highlights.
              </small>
            </div>
            <div className="result-groups">
              <div className="eyebrow">YOUR ARENA DECISIONS</div>
              <h3>A place for every personality.</h3>
              {(['keep', 'group', 'retire'] as const).map((fate, i) => {
                const tabs = state.characters.filter((c) => c.fate === fate);
                return (
                  <div className="group-result" key={fate}>
                    <Folder size={21} style={{ color: ['#6b8e61', '#9e83bf', '#c77c52'][i] }} />
                    <div>
                      <b>{['The headliners', 'Found their people', 'The balcony critics'][i]}</b>
                      <p>{tabs.map((c) => c.name).join(' · ') || 'No auditions accepted.'}</p>
                    </div>
                    <span>{tabs.length}</span>
                  </div>
                );
              })}
              {state.history.some((h) => h.includes('“')) && (
                <div className="recap-highlights">
                  <span className="eyebrow">OVERHEARD IN THERAPY</span>
                  {state.history
                    .filter((h) => h.includes('“'))
                    .slice(-3)
                    .map((h, i) => (
                      <p key={i}>{h}</p>
                    ))}
                </div>
              )}
              {integration}
              <p className="safe-note">
                <ShieldCheck size={16} />
                {realMode
                  ? 'Real grouping requires a separate preview and approval.'
                  : 'These verdicts are fictional. Your real browser hasn’t been touched.'}
              </p>
            </div>
          </section>
        ) : (
          <section className={`workspace ${state.phase === 'voting' ? 'is-voting' : ''}`}>
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
              <div className="therapist-host">
                <Mic size={18} />
                <div>
                  <b>The therapist</b>
                  <span>Your host. One voice at a time.</span>
                </div>
                <small>
                  {!speaker && active ? 'Leading the session' : 'Listening to the cast'}
                </small>
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
              <div className={`caption-panel ${!speaker ? 'therapist-caption' : ''}`}>
                <button
                  className="replay-line icon-button"
                  aria-label="Replay line"
                  disabled={!sound || !active}
                  onClick={() => setReplay((n) => n + 1)}
                >
                  <RotateCcw size={15} />
                </button>
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
                    {reduced ||
                    voiceHold ||
                    state.phase === 'lobby' ||
                    (state.phase === 'voting' && !state.actionLine)
                      ? line
                      : line.slice(0, Math.floor(elapsed / 23))}
                  </p>
                  <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {speaker?.name ?? 'Therapist'}: {line}
                  </p>
                </div>
                <span className="caption-on">CC</span>
              </div>
              {active && selected && (
                <div className="comedy-controls">
                  <span>
                    Selected tab: <b title={selected.title}>{selected.name}</b>
                  </span>
                  <button
                    className="button"
                    disabled={paused || !!modal}
                    onClick={() => dispatch({ type: 'SPEAK', id: selected.id })}
                  >
                    <Mic size={15} /> Hear their excuse
                  </button>
                  <button
                    className="button roast-button"
                    disabled={paused || !!modal}
                    onClick={() => dispatch({ type: 'ROAST', id: selected.id })}
                  >
                    <MessageSquare size={15} /> Roast this tab
                  </button>
                </div>
              )}
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
              <details className="audio-settings">
                <summary>
                  Audio settings{' '}
                  <span>
                    {sound
                      ? voiceMode !== 'off' && voiceURI
                        ? voiceMode === 'cloud'
                          ? 'ElevenLabs cast'
                          : 'Device cast'
                        : 'Effects only'
                      : 'Muted'}
                  </span>
                </summary>
                <div className="audio-options">
                  <label>
                    Volume{' '}
                    <input
                      aria-label="Sound volume"
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                    <output>{volume}%</output>
                  </label>
                  <button className="button" onClick={() => void enableAudio()}>
                    Test sound
                  </button>
                </div>
                <VoiceStudio
                  cast={cast}
                  localVoices={voices}
                  mode={voiceMode}
                  setMode={setVoiceMode}
                  mapping={voiceMap}
                  setMapping={voiceMode === 'cloud' ? setCloudMap : setLocalMap}
                  cloudVoices={cloudVoices}
                  setCloudVoices={setCloudVoices}
                  status={audioMessage}
                  onPreview={(id) => {
                    setPaused(true);
                    void audio.current
                      .unlock()
                      .then(
                        () =>
                          new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
                      )
                      .then(() => {
                        const c = state.characters.find((c) => c.id === id);
                        const text = c
                          ? `I am ${c.name}. I have a perfectly reasonable explanation for all of this.`
                          : 'Welcome. Take a breath. I run this room, and every tab will get its turn.';
                        if (voiceMode === 'cloud') {
                          setVoiceHold(true);
                          void audio.current.speakCloud(
                            text,
                            voiceMap[id],
                            c?.emotion ?? 'neutral',
                            id === 'therapist',
                            () => setVoiceHold(false),
                            (message) => {
                              setVoiceHold(false);
                              setAudioMessage(message);
                            },
                          );
                        } else
                          audio.current.speak(
                            text,
                            voiceMap[id],
                            id === 'therapist' ? 0.93 : 1,
                            () => setAudioMessage('Could not preview this voice.'),
                            id === 'therapist' ? 0.94 : 1,
                          );
                      })
                      .catch(() =>
                        setAudioMessage('Could not start voice preview. Check audio permissions.'),
                      );
                  }}
                />
              </details>
            </div>
            <aside className="dossier" aria-label="Character dossier">
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
                    <Star className="portrait-star" size={18} />
                  </div>
                  <div className="dossier-name">
                    <h2 title={selected.title}>{selected.name}</h2>
                    <span className="emotion-tag">{selected.emotion}</span>
                  </div>
                  <details className="full-title" key={selected.id}>
                    <summary>Full tab title</summary>
                    <p>{selected.title}</p>
                  </details>
                  <p className="character-role">{selected.role}</p>
                  <div className="character-facts">
                    <span>
                      <i style={{ background: selected.color }} />
                      {categoryNames[selected.category]}
                    </span>
                    {selected.pinned && <span>⌖ Pinned</span>}
                    {selected.audible && (
                      <span>
                        <Volume2 size={12} /> Audible
                      </span>
                    )}
                  </div>
                  {state.phase === 'voting' ? (
                    <VotePanel
                      state={state}
                      paused={paused || !!modal}
                      onDecide={decide}
                      onNext={nextUndecided}
                      onUndo={() => dispatch({ type: 'UNDO_DECISION' })}
                      onFinish={() => dispatch({ type: 'FINISH' })}
                    />
                  ) : (
                    <>
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
                            <i
                              style={{ width: `${selected.confidence}%`, background: '#c7b4de' }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="evidence">
                        <span className="tiny-label">THE RECEIPTS</span>
                        <p>
                          {duplicates.some((g) => g.includes(selected.id)) ? (
                            <>
                              <span>◫</span> Shares an address with another tab.
                              <b>Suspicious? Very.</b>
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
                          <small>
                            <Heart size={12} /> {selected.allies.length} allies in the productivity
                            coalition
                          </small>
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
                </>
              )}
              <div className="dossier-foot">
                <span className="mini-live" />
                {saved && active
                  ? 'Progress saved in this tab · Restart to clear'
                  : state.phase === 'lobby'
                    ? 'Start therapy to hear their side.'
                    : 'Select a character, then hear their excuse.'}
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
                  title={c.title}
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
            Made with too many tabs open <Heart className="heart" size={12} />
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
              The game uses fictional demo data or a local tab snapshot. No analytics or page
              scraping. Your motion preference stays on this device. Game progress, including tab
              titles and URLs in real mode, is saved in this browser tab’s session storage so a
              reload can resume it. Checkpoints older than 24 hours are not restored. Restart clears
              game progress.
            </p>
            <p>
              The optional extension reads tab titles, URLs, pinned state, and audible state only
              after you grant permission. It processes these locally and excludes private windows,
              pinned tabs, and internal pages from grouping.
            </p>
            <p>
              Optional ElevenLabs voices send spoken lines, including tab titles, through your local
              voice server to ElevenLabs. The API key stays in the server environment file. Provider
              retention and charges apply. Device voice preview stays local. Voice assignments are
              saved on this device.
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
