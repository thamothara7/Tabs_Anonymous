/** Record only disposable fixture tabs. Requires builds, Playwright, ffmpeg and local Kokoro. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile, cp, mkdtemp, rm } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
const out = resolve('artifacts/submission');
await mkdir(out, { recursive: true });
const chapters = [
  [
    'A support group for your tabs',
    'Your browser tabs formed a support group. This walkthrough uses fictional tabs and scripted gameplay, narrated locally with Kokoro.',
  ],
  [
    'The duplicate has an alibi',
    'The therapist hosts. Tabs confess, expose duplicates, and argue for their place. Same address, twice the emotional baggage.',
  ],
  [
    'Call a witness',
    'Give a tab the microphone, challenge its excuse, or call a witness. Their reactions depend on the cast and your choices.',
  ],
  [
    'Your verdict. Their feelings.',
    'Keep your favourites, find groups for the others, or send them to the balcony. Undo changes your mind without closing a real tab.',
  ],
  [
    'Every meeting needs an award',
    'Finish every verdict to reveal your award. Save a high resolution PNG or a text recap of your session.',
  ],
  [
    'A short film, made locally',
    'The recap becomes a silent Full HD film, rendered on your computer. Optional local AI can also write fresh dialogue during gameplay.',
  ],
  [
    'Real grouping requires your approval',
    'In the extension, review the exact tabs before applying native groups. This preview uses two disposable fixture tabs. No tabs are automatically closed.',
  ],
];
const probe = (file) =>
  JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], {
      encoding: 'utf8',
    }),
  );
for (let i = 0; i < chapters.length; i++) {
  const r = await fetch('http://127.0.0.1:4317/kokoro/speech', {
    method: 'POST',
    headers: {
      Origin: 'http://127.0.0.1:4173',
      'X-TA-Client': '1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: chapters[i][1],
      voiceId: 'bm_george',
      emotion: 'neutral',
      therapist: true,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(await r.text());
  const file = join(out, `narration-${i}.wav`);
  await writeFile(file, Buffer.from(await r.arrayBuffer()));
  chapters[i].push(Math.max(8, Number(probe(file).format.duration) + 1));
}
let server;
try {
  const r = await fetch('http://127.0.0.1:4173');
  if (!r.ok) throw new Error();
} catch {
  server = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      '4173',
      '--strictPort',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch('http://127.0.0.1:4173')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
}
const root = await mkdtemp(join(tmpdir(), 'tabs-walkthrough-'));
const shots = [];
const contexts = [];
const config = {
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: join(out, 'raw'), size: { width: 1920, height: 1080 } },
};
const setup = async (page) => {
  await page.addStyleTag({ content: 'body{zoom:.85}' });
  await page.evaluate(() => {
    const banner = document.createElement('div');
    banner.id = 'walkthrough-caption';
    banner.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#173035;color:#fff8df;padding:18px 40px;font:22px/1.45 Arial,sans-serif;box-shadow:0 -2px 16px #0003;pointer-events:none;';
    document.body.append(banner);
  });
};
const caption = async (page, i) =>
  page.locator('#walkthrough-caption').evaluate((el, data) => {
    el.replaceChildren();
    const title = document.createElement('b');
    title.textContent = data[0] + '  /  ';
    el.append(title, document.createTextNode(data[1]));
  }, chapters[i]);
const click = (page, name) => page.getByRole('button', { name, exact: true }).click();
const scroll = async (page, selector) =>
  page
    .locator(selector)
    .evaluate((el) =>
      window.scrollTo({
        top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 20),
        behavior: 'instant',
      }),
    );
const shot = async (page, t0, i, action) => {
  await caption(page, i);
  const start = (Date.now() - t0) / 1000;
  await action();
  const duration = chapters[i][2];
  await page.waitForTimeout(Math.max(0, duration * 1000 - (Date.now() - t0 - start * 1000)));
  shots.push({ chapter: i, start, duration, video: page.video() });
  console.log(`Recorded ${i + 1}/${chapters.length}: ${chapters[i][0]}`);
};
try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(config);
  contexts.push(context);
  await context.route('http://127.0.0.1:4317/dialogue', (route) =>
    route.fulfill({
      status: 503,
      json: { error: 'This recorded walkthrough uses scripted dialogue.' },
    }),
  );
  const t0 = Date.now(),
    page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await setup(page);
  await shot(page, t0, 0, async () => {
    await click(page, 'Start therapy');
    await scroll(page, '.theater');
    await page.waitForTimeout(1800);
    await click(page, 'Pause session');
  });
  await shot(page, t0, 1, async () => {
    for (let i = 0; i < 3; i++) await click(page, 'Skip scene');
    await scroll(page, '.theater');
  });
  await shot(page, t0, 2, async () => {
    await click(page, 'Resume session');
    await click(page, 'Call a witness');
    await page.waitForTimeout(2500);
    await click(page, 'Pause session');
    await scroll(page, '.theater');
  });
  await click(page, 'Skip scene');
  for (let i = 0; i < 7; i++) await click(page, 'Skip scene');
  await click(page, 'Resume session');
  await shot(page, t0, 3, async () => {
    await scroll(page, '.theater');
    await click(page, 'Keep in the spotlight');
    await page.waitForTimeout(1800);
    await click(page, 'Undo last verdict');
    await page.waitForTimeout(1200);
    await click(page, 'Find their people');
    await click(page, 'Next undecided');
    await click(page, 'Retire from arena');
  });
  for (let i = 2; i < 12; i++) {
    await click(page, 'Next undecided');
    await click(page, i < 6 ? 'Keep in the spotlight' : 'Find their people');
  }
  await click(page, 'The awards ceremony');
  await shot(page, t0, 4, async () => {
    await scroll(page, '.ceremony-hero');
    await page.waitForTimeout(3000);
    await scroll(page, '.png-award');
  });
  await shot(page, t0, 5, async () => {
    await scroll(page, '.recap-reel');
    await click(page, 'Play reel');
  });
  await context.close();
  await browser.close();
  const extension = join(root, 'extension');
  await cp(resolve('dist-extension'), extension, { recursive: true });
  const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
  manifest.permissions = ['tabs', 'tabGroups'];
  manifest.optional_permissions = [];
  manifest.background = { service_worker: 'fixture-worker.js' };
  await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(
    join(extension, 'fixture-worker.js'),
    'chrome.runtime.onInstalled.addListener(() => {});',
  );
  const native = await chromium.launchPersistentContext(join(root, 'profile'), {
    ...config,
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  contexts.push(native);
  await native.route('http://127.0.0.1:4317/dialogue', (route) =>
    route.fulfill({ status: 503, json: { error: 'Scripted fixture walkthrough.' } }),
  );
  const worker = native.serviceWorkers()[0] ?? (await native.waitForEvent('serviceworker'));
  const id = new URL(worker.url()).hostname;
  for (const [i, title] of ['Hackathon planning', 'Java study guide'].entries()) {
    const tab = await native.newPage();
    await tab.goto(`http://127.0.0.1:4173/?fixture=${i}`);
    await tab.evaluate((t) => (document.title = t), title);
  }
  const n0 = Date.now(),
    arena = await native.newPage();
  await arena.goto(`chrome-extension://${id}/index.html#arena`);
  await click(arena, 'Connect this window');
  await click(arena, 'Start therapy');
  for (let i = 0; i < 10; i++) await click(arena, 'Skip scene');
  await click(arena, 'Find their people');
  await click(arena, 'Next undecided');
  await click(arena, 'Keep in the spotlight');
  await click(arena, 'The awards ceremony');
  await click(arena, 'Preview native groups');
  await setup(arena);
  await shot(arena, n0, 6, async () => {
    await scroll(arena, '.native-preview');
  });
  await arena.screenshot({ path: join(out, 'native-preview.png') });
  await native.close();
  for (const s of shots) {
    const source = await s.video.path();
    const clip = join(out, `chapter-${s.chapter}.mp4`);
    execFileSync('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-ss',
      String(s.start),
      '-i',
      source,
      '-i',
      join(out, `narration-${s.chapter}.wav`),
      '-t',
      String(s.duration),
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-vf',
      'fps=30,scale=1920:1080,setsar=1',
      '-af',
      'apad',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      clip,
    ]);
  }
  await writeFile(
    join(out, 'chapters.txt'),
    shots.map((s) => `file 'chapter-${s.chapter}.mp4'`).join('\n'),
  );
  const final = join(out, 'tabs-anonymous-walkthrough.mp4');
  execFileSync('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    join(out, 'chapters.txt'),
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    final,
  ]);
  let at = 0;
  const time = (n) => new Date(Math.round(n * 1000)).toISOString().slice(11, 23).replace('.', ',');
  await writeFile(
    join(out, 'walkthrough.srt'),
    shots
      .map((s, i) => {
        const start = at;
        at += s.duration;
        return `${i + 1}\n${time(start)} --> ${time(at)}\n${chapters[i][1]}\n`;
      })
      .join('\n'),
  );
  const metadata = probe(final);
  await writeFile(
    join(out, 'verification.json'),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        mode: 'Actual UI, scripted fictional gameplay, local Kokoro narration; disposable native fixture profile with pregranted permissions',
        chapters: shots.map(({ video, ...s }) => s),
        metadata,
      },
      null,
      2,
    ),
  );
  console.log(`Created ${final} (${Number(metadata.format.duration).toFixed(1)} seconds)`);
} finally {
  for (const c of contexts) await c.close().catch(() => {});
  server?.kill();
  await rm(root, { recursive: true, force: true });
}
