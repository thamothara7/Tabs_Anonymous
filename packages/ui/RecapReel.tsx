import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw, X } from 'lucide-react';
import type { GameState } from '../game-core/types';
import {
  chapterAt,
  createReel,
  drawReel,
  recordReel,
  REEL_DURATION,
  videoExtension,
  videoMime,
} from './reel';

export function RecapReel({ state, reduced }: { state: GameState; reduced: boolean }) {
  const reel = useMemo(() => createReel(state), [state]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const position = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const [seconds, setSeconds] = useState(0),
    [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false),
    [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    'Ready. A silent, captioned film made from your verdicts.',
  );
  const [minimal, setMinimal] = useState(reduced);
  const index = chapterAt(seconds),
    chapter = reel.chapters[index];
  useEffect(() => {
    setMinimal(reduced);
  }, [reduced]);
  useEffect(() => {
    if (canvas.current) drawReel(canvas.current, reel, seconds, minimal);
  }, [reel, seconds, minimal]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now();
    const tick = (now: number) => {
      if (now - last < 1000 / 30) {
        frame = requestAnimationFrame(tick);
        return;
      }
      position.current = Math.min(REEL_DURATION, position.current + (now - last) / 1000);
      last = now;
      setSeconds(position.current);
      if (position.current >= REEL_DURATION) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        setPlaying(false);
        abort.current?.abort();
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      abort.current?.abort();
    };
  }, []);
  const seek = (time: number) => {
    setPlaying(false);
    position.current = time;
    setSeconds(time);
  };
  const save = async () => {
    setPlaying(false);
    setExporting(true);
    setProgress(0);
    setMessage('Creating your film. Keep this tab visible.');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const blob = await recordReel(reel, minimal, controller.signal, setProgress);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = `tabs-anonymous-recap.${videoExtension(blob.type)}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Video saved. Full HD, 30 fps, silent, with no tab names or URLs.');
    } catch (e) {
      setMessage(
        e instanceof DOMException && e.name === 'AbortError'
          ? 'Export canceled. Nothing was downloaded.'
          : e instanceof Error
            ? e.message
            : 'Video export failed. Try the recap card.',
      );
    } finally {
      abort.current = null;
      setExporting(false);
    }
  };
  return (
    <section className="recap-reel" aria-label="Animated recap">
      <div className="reel-heading">
        <div>
          <span className="eyebrow">THE POST-CREDITS SESSION</span>
          <h3>Your tabs made a short film.</h3>
        </div>
        <span className="reel-duration">1080P / 30 FPS</span>
      </div>
      <canvas
        ref={canvas}
        width={1200}
        height={675}
        role="img"
        aria-label={`${chapter.label}. ${chapter.title}. ${chapter.line}`}
      />
      <div className="reel-chapters" aria-label="Reel chapters">
        {reel.chapters.map((c, i) => (
          <button
            key={c.label}
            aria-label={`Reel chapter ${i + 1}: ${c.label}`}
            aria-pressed={index === i}
            onClick={() => seek(i * 3)}
          >
            <span>0{i + 1}</span>
            {['Opening', 'Spotlight', 'Together', 'Balcony', 'Award'][i]}
          </button>
        ))}
      </div>
      <p className="reel-caption" aria-live="polite">
        <b>{chapter.title}</b> {chapter.line}
      </p>
      <label className="reel-timeline">
        Reel position
        <input
          type="range"
          min="0"
          max={REEL_DURATION}
          step="0.1"
          value={seconds}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span>{Math.floor(seconds)} / 15s</span>
      </label>
      <div className="reel-controls">
        <button
          className="button"
          onClick={() => {
            if (position.current >= REEL_DURATION) seek(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
          {playing ? 'Pause reel' : 'Play reel'}
        </button>
        <button className="button" onClick={() => seek(0)}>
          <RotateCcw size={16} />
          Restart reel
        </button>
        <label>
          <input
            type="checkbox"
            checked={minimal}
            disabled={exporting}
            onChange={(e) => setMinimal(e.target.checked)}
          />
          Minimal motion
        </label>
        {exporting ? (
          <button className="button" onClick={() => abort.current?.abort()}>
            <X size={16} />
            Cancel export
          </button>
        ) : (
          <button className="button orange" disabled={!videoMime()} onClick={() => void save()}>
            <Download size={16} />
            Save video
          </button>
        )}
      </div>
      {exporting && (
        <progress aria-label="Video export progress" value={progress} max={REEL_DURATION} />
      )}
      <p role="status">
        {!videoMime()
          ? 'Video export is unavailable here. Preview the reel or save a PNG card.'
          : message}
      </p>
      <small>
        {videoMime()?.startsWith('video/mp4') ? 'MP4' : 'WebM'} · Full HD · 15 seconds · Silent.
        Only fictional characters, your award, and verdict counts appear. No screen recording,
        microphone, or cloud upload.
      </small>
    </section>
  );
}
