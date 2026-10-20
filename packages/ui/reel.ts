import { endingFor } from '../game-core/reducer';
import type { GameState } from '../game-core/types';

export const REEL_DURATION = 15;
export const CHAPTER_SECONDS = 3;
export interface ReelChapter {
  label: string;
  title: string;
  line: string;
  count: number;
  color: string;
}
export interface SafeReel {
  chapters: ReelChapter[];
  counts: number[];
}
/** Only aggregate verdicts and authored copy cross the sharing boundary. */
export function createReel(state: GameState): SafeReel {
  const counts = ['keep', 'group', 'retire'].map(
    (fate) => state.characters.filter((c) => c.fate === fate).length,
  );
  const ending = endingFor(state);
  return {
    counts,
    chapters: [
      {
        label: 'THE THERAPIST',
        title: 'We need to talk.',
        line: 'You came for closure. Your tabs brought a lawyer.',
        count: state.characters.length,
        color: '#9bcbd7',
      },
      {
        label: 'THE HEADLINERS',
        title: `${counts[0]} kept in the spotlight`,
        line: counts[0]
          ? 'A standing ovation. Mostly from themselves.'
          : 'Nobody got a rose. The browser is processing this.',
        count: counts[0],
        color: '#e9c783',
      },
      {
        label: 'GROUP THERAPY',
        title: `${counts[1]} found their people`,
        line: counts[1]
          ? 'A support group inside a support group. Very efficient.'
          : 'No group project. Everyone suddenly had plans.',
        count: counts[1],
        color: '#c3b4f2',
      },
      {
        label: 'THE BALCONY CRITICS',
        title: `${counts[2]} retired from the arena`,
        line: counts[2]
          ? 'Still open. Still judging. Excellent view, though.'
          : 'An empty balcony. Even the critics got a callback.',
        count: counts[2],
        color: '#f49a86',
      },
      {
        label: 'YOUR UNOFFICIAL AWARD',
        title: ending.title,
        line: 'The meeting is over. The emotional processing is not.',
        count: Math.min(5, state.characters.length),
        color: '#a6cfb4',
      },
    ],
  };
}
export function chapterAt(seconds: number) {
  return Math.max(0, Math.min(4, Math.floor(seconds / CHAPTER_SECONDS)));
}
const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  maxWidth = 1056,
) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(value, x, y, maxWidth);
}
function actor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  phase: number,
  reduced: boolean,
  mood: number,
) {
  ctx.save();
  ctx.translate(x, y + (reduced ? 0 : Math.sin(phase * 3) * 7));
  ctx.rotate(reduced ? 0 : Math.sin(phase * 2) * 0.045);
  ctx.fillStyle = '#142d30';
  ctx.beginPath();
  ctx.ellipse(0, 100, 50, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#152e33';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-23, 64);
  ctx.lineTo(-23, 94);
  ctx.lineTo(-34, 97);
  ctx.moveTo(23, 64);
  ctx.lineTo(23, 94);
  ctx.lineTo(34, 97);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-52, 15);
  ctx.quadraticCurveTo(-77, -10, -77, mood === 1 ? -35 : 37);
  ctx.moveTo(52, 15);
  ctx.quadraticCurveTo(77, -10, 77, mood === 1 ? -35 : 37);
  ctx.stroke();
  ctx.fillStyle = color;
  const body = new Path2D(
    'M-55-26V-50Q-55-60-45-60H-17L-3-40H44Q55-40 55-29V57Q55 67 44 67H-44Q-55 67-55 57Z',
  );
  ctx.fill(body);
  ctx.lineWidth = 4;
  ctx.stroke(body);
  ctx.fillStyle = '#fff6dc';
  for (const eye of [-22, 23]) {
    ctx.beginPath();
    ctx.ellipse(eye, 6, 13, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#21363b';
  for (const eye of [-20, 25]) {
    ctx.beginPath();
    ctx.arc(eye, 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-32, -20);
  ctx.lineTo(-12, mood === 3 ? -25 : -20);
  ctx.moveTo(14, -20);
  ctx.lineTo(34, mood === 3 ? -14 : -20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, 37);
  ctx.quadraticCurveTo(0, mood === 3 ? 25 : 59, 16, 37);
  ctx.stroke();
  ctx.restore();
}
export function drawReel(
  canvas: HTMLCanvasElement,
  reel: SafeReel,
  seconds: number,
  reduced = false,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable. Save the recap card instead.');
  const index = chapterAt(seconds),
    c = reel.chapters[index],
    local = seconds - index * 3;
  ctx.clearRect(0, 0, 1200, 630);
  ctx.fillStyle = '#203b40';
  ctx.fillRect(0, 0, 1200, 630);
  const glow = ctx.createRadialGradient(600, 250, 0, 600, 250, 600);
  glow.addColorStop(0, '#48615a');
  glow.addColorStop(1, '#203b40');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = '#78917d';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, 1156, 586);
  text(ctx, 'TABS ANONYMOUS', 600, 66, 18, '#d3dfc5');
  text(ctx, c.label, 600, 116, 14, c.color);
  ctx.save();
  ctx.globalAlpha = reduced ? 1 : ease(local * 3 + 0.15);
  ctx.translate(0, reduced ? 0 : 18 * (1 - ease(local * 3)));
  text(ctx, c.title, 600, 190, 48, '#fff5dc');
  text(ctx, c.line, 600, 239, 21, '#d1ddcb');
  ctx.restore();
  ctx.fillStyle = '#314b47';
  ctx.beginPath();
  ctx.ellipse(600, 473, 430, 65, 0, 0, Math.PI * 2);
  ctx.fill();
  const n = Math.min(5, c.count);
  for (let i = 0; i < n; i++) {
    const enter = reduced ? 1 : ease((local - i * 0.09) * 2.7);
    ctx.save();
    ctx.globalAlpha = enter;
    actor(
      ctx,
      600 + (i - (n - 1) / 2) * 155,
      390 + (1 - enter) * 70,
      index === 4 ? ['#c3b4f2', '#f49a86', '#a6cfb4', '#e9c783', '#9bcbd7'][i] : c.color,
      seconds + i,
      reduced,
      index,
    );
    ctx.restore();
  }
  if (!n) text(ctx, 'Reserved for unresolved feelings.', 600, 416, 25, '#b1c6b3');
  if (index === 4) {
    text(
      ctx,
      `${reel.counts[0]} KEPT     ${reel.counts[1]} GROUPED     ${reel.counts[2]} RETIRED`,
      600,
      545,
      18,
      '#e9c783',
    );
  } else
    text(
      ctx,
      index === 0
        ? 'A SHORT FILM ABOUT VERY LONG BROWSING SESSIONS'
        : `${c.count} ${c.count === 1 ? 'TAB' : 'TABS'}. ZERO REAL TABS CLOSED.`,
      600,
      545,
      16,
      '#b6cbb5',
    );
  text(ctx, 'FICTIONAL FEELINGS. NO BROWSING DETAILS.', 600, 585, 12, '#afc3b0');
  ctx.fillStyle = '#e9c783';
  ctx.fillRect(22, 605, 1156 * Math.min(1, seconds / REEL_DURATION), 3);
}
export function videoMime(): string | null {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    !HTMLCanvasElement.prototype.captureStream
  )
    return null;
  return (
    ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? null
  );
}
/** Records only our generated canvas. Never captures the screen, microphone, or tab audio. */
export function recordReel(
  reel: SafeReel,
  reduced: boolean,
  signal: AbortSignal,
  progress: (seconds: number) => void,
): Promise<Blob> {
  const mime = videoMime();
  if (!mime)
    return Promise.reject(
      new Error('Video export is unavailable in this browser. Use the PNG or SVG card.'),
    );
  if (signal.aborted) return Promise.reject(new DOMException('Export canceled', 'AbortError'));
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    let stream: MediaStream | undefined,
      recorder: MediaRecorder | undefined,
      frame = 0,
      timer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const chunks: Blob[] = [];
    const cleanup = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      stream?.getTracks().forEach((t) => t.stop());
    };
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      if (recorder?.state === 'recording') recorder.stop();
      cleanup();
      reject(error);
    };
    const abort = () => fail(new DOMException('Export canceled', 'AbortError'));
    try {
      drawReel(canvas, reel, 0, reduced);
      stream = canvas.captureStream(30);
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () =>
        fail(new Error('Video recording failed. Try the recap card instead.'));
      recorder.onstop = () => {
        if (finished) return;
        finished = true;
        cleanup();
        const blob = new Blob(chunks, { type: mime });
        if (blob.size) resolve(blob);
        else reject(new Error('The browser produced an empty video.'));
      };
      signal.addEventListener('abort', abort, { once: true });
      recorder.start(250);
      const start = performance.now();
      const tick = (now: number) => {
        if (finished) return;
        try {
          const elapsed = Math.min(REEL_DURATION, (now - start) / 1000);
          drawReel(canvas, reel, elapsed, reduced);
          progress(elapsed);
          if (elapsed >= REEL_DURATION) recorder!.stop();
          else frame = requestAnimationFrame(tick);
        } catch (e) {
          fail(e);
        }
      };
      frame = requestAnimationFrame(tick);
      timer = setTimeout(
        () => fail(new Error('Export timed out. Keep this tab visible and try again.')),
        25000,
      );
    } catch (e) {
      fail(e);
    }
  });
}
