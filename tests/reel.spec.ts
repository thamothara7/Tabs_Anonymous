import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function finish(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  for (let i = 0; i < 12; i++) {
    if (i) await page.getByRole('button', { name: 'Next undecided' }).click();
    await page
      .getByRole('button', {
        name: i < 3 ? 'Keep in the spotlight' : i < 8 ? 'Find their people' : 'Retire from arena',
      })
      .click();
  }
  await page.getByRole('button', { name: 'The awards ceremony' }).click();
}
test('reel chapters, paused scrubbing, reduced motion, and cancellation', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const capture = HTMLCanvasElement.prototype.captureStream;
    (window as any).__reelStreams = [];
    HTMLCanvasElement.prototype.captureStream = function (rate) {
      const stream = capture.call(this, rate);
      (window as any).__reelStreams.push(stream);
      return stream;
    };
  });
  await finish(page);
  const reel = page.getByRole('region', { name: 'Animated recap' });
  await expect(reel.getByLabel('Minimal motion')).toBeChecked();
  await expect(reel.getByRole('slider')).toHaveValue('0');
  await reel.getByRole('button', { name: 'Reel chapter 3: GROUP THERAPY' }).click();
  await expect(reel.getByRole('img')).toHaveAttribute('aria-label', /5 found their people/);
  await reel.getByRole('button', { name: 'Play reel', exact: true }).click();
  await expect
    .poll(async () => Number(await reel.getByRole('slider').inputValue()))
    .toBeGreaterThan(6);
  await reel.getByRole('button', { name: 'Pause reel' }).click();
  const at = await reel.getByRole('slider').inputValue();
  await page.waitForTimeout(200);
  await expect(reel.getByRole('slider')).toHaveValue(at);
  await reel.getByRole('button', { name: 'Save video' }).click();
  await expect(reel.getByRole('progressbar')).toBeVisible();
  await reel.getByRole('button', { name: 'Cancel export' }).click();
  await expect(reel.getByRole('status')).toContainText('Export canceled');
  expect(
    await page.evaluate(() =>
      (window as any).__reelStreams.every((s: MediaStream) =>
        s.getTracks().every((t) => t.readyState === 'ended'),
      ),
    ),
  ).toBe(true);
  await reel.getByRole('button', { name: 'Reel chapter 5: YOUR UNOFFICIAL AWARD' }).click();
  await reel.screenshot({ path: `artifacts/${info.project.name}-reel.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('exports a real playable WebM with the full local reel', async ({ page }, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Native encoder verified once on desktop; mobile controls covered separately.',
  );
  test.setTimeout(45000);
  await finish(page);
  const reel = page.getByRole('region', { name: 'Animated recap' });
  const download = page.waitForEvent('download');
  await reel.getByLabel('Minimal motion').uncheck();
  await reel.getByRole('button', { name: 'Save video' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('tabs-anonymous-recap.webm');
  const path = 'artifacts/recap-film.webm';
  await file.saveAs(path);
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 4).toString('hex')).toBe('1a45dfa3');
  expect(bytes.length).toBeGreaterThan(10000);
  const metadata = await page.evaluate(async (data) => {
    const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([raw], { type: 'video/webm' }));
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Invalid video'));
      });
      video.currentTime = 13;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
      return { width: video.videoWidth, height: video.videoHeight, time: video.currentTime };
    } finally {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    }
  }, bytes.toString('base64'));
  expect(metadata).toEqual({ width: 1200, height: 630, time: 13 });
  await expect(reel.getByRole('status')).toContainText('Video saved');
});
test('unsupported video keeps the recap usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'MediaRecorder', { value: undefined });
  });
  await finish(page);
  const reel = page.getByRole('region', { name: 'Animated recap' });
  await expect(reel.getByRole('button', { name: 'Save video' })).toBeDisabled();
  await expect(reel.getByRole('status')).toContainText('unavailable');
  await reel.getByRole('button', { name: 'Reel chapter 2: THE HEADLINERS' }).click();
  await expect(reel.getByRole('img')).toHaveAttribute('aria-label', /3 kept/);
});
