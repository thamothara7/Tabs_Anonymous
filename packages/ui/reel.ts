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
export const REEL_WIDTH = 1920;
export const REEL_HEIGHT = 1080;
export const CARD_WIDTH = 2400;
export const CARD_HEIGHT = 1350;
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 600,
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Manrope", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(value, x, y);
}
function wrapped(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  width: number,
) {
  ctx.font = `700 ${size}px "Manrope", sans-serif`;
  const lines: string[] = [''];
  for (const word of value.split(' ')) {
    const i = lines.length - 1,
      next = `${lines[i]} ${word}`.trim();
    if (ctx.measureText(next).width > width && lines[i]) lines.push(word);
    else lines[i] = next;
  }
  lines.forEach((line, i) => text(ctx, line, x, y + i * size * 1.15, size, color, 700));
  return lines.length;
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      size = i % 2 ? r * 0.44 : r;
    const px = x + Math.cos(a) * size,
      py = y + Math.sin(a) * size;
    if (!i) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function paintActor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  phase: number,
  reduced: boolean,
  mood: number,
  variant: number,
) {
  ctx.save();
  ctx.translate(x, y + (reduced ? 0 : Math.sin(phase * 3) * 5));
  ctx.rotate(reduced ? 0 : Math.sin(phase * 2) * 0.035);
  const shadow = ctx.createRadialGradient(0, 101, 0, 0, 101, 65);
  shadow.addColorStop(0, '#0009');
  shadow.addColorStop(1, '#0000');
  ctx.fillStyle = shadow;
  ctx.fillRect(-70, 88, 140, 25);
  ctx.strokeStyle = '#142a36';
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
  ctx.quadraticCurveTo(-77, -10, -77, mood === 1 || mood === 4 ? -30 : 37);
  ctx.moveTo(52, 15);
  ctx.quadraticCurveTo(77, -10, 77, mood === 1 || mood === 4 ? -30 : 37);
  ctx.stroke();
  const shell = ctx.createLinearGradient(-55, -60, 55, 67);
  shell.addColorStop(0, '#fff4dc');
  shell.addColorStop(0.27, color);
  shell.addColorStop(0.8, color);
  shell.addColorStop(1, '#637587');
  ctx.fillStyle = shell;
  const body = new Path2D(
    'M-55-26V-50Q-55-60-45-60H-17L-3-40H44Q55-40 55-29V57Q55 67 44 67H-44Q-55 67-55 57Z',
  );
  ctx.shadowColor = '#060e1c66';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 7;
  ctx.fill(body);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 3;
  ctx.stroke(body);
  ctx.strokeStyle = '#ffffff80';
  ctx.lineWidth = 2;
  ctx.stroke(
    new Path2D('M-48-24V-49Q-48-53-42-53H-21L-7-33H42Q48-33 48-26V55Q48 60 42 60H-42Q-48 60-48 55'),
  );
  ctx.fillStyle = '#ffffff60';
  ctx.beginPath();
  ctx.roundRect(-43, -49, 20, 15, 4);
  ctx.fill();
  text(ctx, ['</>', '+', '$', 'A', '*'][variant % 5], -33, -38, 9, '#364452');
  ctx.fillStyle = '#fff9ed';
  for (const eye of [-22, 23]) {
    ctx.beginPath();
    ctx.ellipse(eye, 6, 13, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const eye of [-20, 25]) {
    ctx.fillStyle = '#263d4b';
    ctx.beginPath();
    ctx.ellipse(eye, 8, 5.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eye + 1, 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#263d4b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-32, -20);
  ctx.lineTo(-12, mood === 3 ? -25 : -22);
  ctx.moveTo(14, -22);
  ctx.lineTo(34, mood === 3 ? -14 : -20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, 37);
  ctx.quadraticCurveTo(0, mood === 3 ? 25 : 59, 16, 37);
  ctx.stroke();
  ctx.fillStyle = '#c95e7e55';
  for (const cheek of [-37, 37]) {
    ctx.beginPath();
    ctx.ellipse(cheek, 28, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (variant % 3 === 1) {
    ctx.strokeStyle = '#385767';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-39, -12, 34, 35, 9);
    ctx.roundRect(6, -12, 34, 35, 9);
    ctx.moveTo(-5, 1);
    ctx.lineTo(6, 1);
    ctx.stroke();
  }
  if (mood === 4 || mood === 1) {
    ctx.fillStyle = '#b88b44';
    ctx.beginPath();
    ctx.arc(44, 54, 13, 0, Math.PI * 2);
    ctx.fill();
    star(ctx, 44, 54, 9, '#fff0b9');
  }
  ctx.restore();
}
const sprites = new Map<string, HTMLCanvasElement>();
function actor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  phase: number,
  reduced: boolean,
  mood: number,
  variant: number,
) {
  const key = `${color}:${mood}:${variant}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = 360;
    sprite.height = 400;
    const art = sprite.getContext('2d')!;
    art.scale(2, 2);
    paintActor(art, 90, 80, color, 0, true, mood, variant);
    if (sprites.size >= 40) sprites.delete(sprites.keys().next().value!);
    sprites.set(key, sprite);
  }
  ctx.save();
  ctx.translate(x, y + (reduced ? 0 : Math.sin(phase * 3) * 5));
  ctx.rotate(reduced ? 0 : Math.sin(phase * 2) * 0.035);
  ctx.drawImage(sprite, -90, -80, 180, 200);
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
  ctx.setTransform(canvas.width / 1200, 0, 0, canvas.height / 675, 0, 0);
  const index = chapterAt(seconds),
    c = reel.chapters[index],
    local = seconds - index * 3;
  const bg = ctx.createLinearGradient(0, 0, 1200, 675);
  bg.addColorStop(0, '#101e30');
  bg.addColorStop(0.5, '#243b47');
  bg.addColorStop(1, '#101b2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 675);
  const glow = ctx.createRadialGradient(600, 340, 20, 600, 340, 500);
  glow.addColorStop(0, '#d9ba6d25');
  glow.addColorStop(1, '#d9ba6d00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 675);
  // Soft stage beams and velvet side wings remain crisp at every export resolution.
  for (const x of [180, 1020]) {
    const beam = ctx.createLinearGradient(x, 0, 600, 600);
    beam.addColorStop(0, '#ffe0a32b');
    beam.addColorStop(1, '#ffe0a300');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 8, 0);
    ctx.lineTo(x + 8, 0);
    ctx.lineTo(x + 240, 580);
    ctx.lineTo(x - 240, 580);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#040d1d35' : '#57727d10';
    ctx.fillRect(i * 14, 0, 14, 675);
    ctx.fillRect(1200 - (i + 1) * 14, 0, 14, 675);
  }
  ctx.strokeStyle = '#d1b57966';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, 1152, 627);
  ctx.strokeRect(30, 30, 1140, 615);
  text(ctx, 'T A B S   A N O N Y M O U S', 600, 64, 14, '#d2c4a3');
  ctx.strokeStyle = '#d1b57966';
  ctx.beginPath();
  ctx.moveTo(390, 82);
  ctx.lineTo(810, 82);
  ctx.stroke();
  text(ctx, c.label, 600, 119, 12, '#e3be76');
  ctx.save();
  ctx.globalAlpha = reduced ? 1 : ease(local * 4 + 0.2);
  ctx.translate(0, reduced ? 0 : 14 * (1 - ease(local * 4)));
  const lines = wrapped(ctx, c.title, 600, 180, 44, '#fff5df', 900);
  wrapped(ctx, c.line, 600, lines > 1 ? 267 : 228, 18, '#c2cdd0', 920);
  ctx.restore();
  if (index === 4) {
    star(ctx, 600, 323, 29, '#f3d591');
    star(ctx, 600, 323, 18, '#fff2ce');
  }
  ctx.fillStyle = '#111e2c';
  ctx.beginPath();
  ctx.ellipse(600, 536, 440, 57, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2d424d';
  ctx.beginPath();
  ctx.ellipse(600, 520, 440, 49, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d5b87570';
  ctx.lineWidth = 2;
  ctx.stroke();
  const n = Math.min(5, c.count);
  for (let i = 0; i < n; i++) {
    const enter = reduced ? 1 : ease((local - i * 0.07) * 3.5);
    ctx.save();
    ctx.globalAlpha = enter;
    actor(
      ctx,
      600 + (i - (n - 1) / 2) * 155,
      420 + (1 - enter) * 55,
      ['#bea6e7', '#f2ad92', '#a5cfb8', '#eaca86', '#9ccbdc'][i],
      seconds + i,
      reduced,
      index,
      i,
    );
    ctx.restore();
  }
  if (!n) text(ctx, 'Reserved for unresolved feelings.', 600, 454, 24, '#b9c6c9');
  if (index === 4) {
    for (let i = 0; i < 32; i++) {
      const x = 125 + ((i * 107) % 950),
        y = 145 + ((i * 83 + (reduced ? 0 : local * 38)) % 350);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(i + (reduced ? 0 : seconds));
      ctx.fillStyle = ['#edc67e', '#bdacd8', '#91bdaf'][i % 3];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-2, -5, 4, 10);
      ctx.restore();
    }
    text(
      ctx,
      `${reel.counts[0]} KEPT    /    ${reel.counts[1]} GROUPED    /    ${reel.counts[2]} RETIRED`,
      600,
      588,
      19,
      '#f1d59a',
    );
  } else
    text(
      ctx,
      index === 0
        ? `${c.count} SEATS. ONE VERY PATIENT THERAPIST.`
        : `${c.count} ${c.count === 1 ? 'TAB' : 'TABS'}. ZERO REAL TABS CLOSED.`,
      600,
      588,
      15,
      '#c1cdcb',
    );
  text(ctx, 'FICTIONAL FEELINGS. NO BROWSING DETAILS.', 600, 624, 10, '#94a8af');
  ctx.fillStyle = '#dfbb78';
  ctx.fillRect(30, 645, 1140 * Math.min(1, seconds / REEL_DURATION), 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
export function videoMime(): string | null {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    !HTMLCanvasElement.prototype.captureStream
  )
    return null;
  return (
    [
      'video/mp4;codecs=avc1.420028',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((type) => MediaRecorder.isTypeSupported(type)) ?? null
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
      new Error('Video export is unavailable in this browser. Use the PNG card.'),
    );
  if (signal.aborted) return Promise.reject(new DOMException('Export canceled', 'AbortError'));
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = REEL_WIDTH;
    canvas.height = REEL_HEIGHT;
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
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () =>
        fail(new Error('Video recording failed. Try the recap card instead.'));
      recorder.onstop = () => {
        if (finished) return;
        finished = true;
        cleanup();
        const blob = new Blob(chunks, { type: recorder!.mimeType || mime });
        if (blob.size) resolve(blob);
        else reject(new Error('The browser produced an empty video.'));
      };
      signal.addEventListener('abort', abort, { once: true });
      recorder.start(250);
      const start = performance.now();
      let lastDraw = start - 34;
      const tick = (now: number) => {
        if (finished) return;
        if (now - lastDraw < 1000 / 30) {
          frame = requestAnimationFrame(tick);
          return;
        }
        lastDraw = now - ((now - lastDraw) % (1000 / 30));
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

export const videoExtension = (mime: string) => (mime.startsWith('video/mp4') ? 'mp4' : 'webm');
