import { test, expect } from '@playwright/test';

test('cloud cast uses a separate therapist, waits for speech, and cancels on pause', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    (window as any).__players = [];
    (window as any).Audio = class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      volume = 1;
      paused = false;
      constructor(public src: string) {
        (window as any).__players.push(this);
      }
      play() {
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
      removeAttribute() {}
      load() {}
    };
  });
  const calls: { voiceId: string; therapist: boolean; text: string; emotion: string }[] = [];
  await page.route('http://127.0.0.1:4317/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, X-TA-Client',
        },
      });
      return;
    }
    if (route.request().url().endsWith('/voices')) {
      await route.fulfill({
        json: {
          voices: Array.from({ length: 13 }, (_, i) => ({
            id: `actor${i}`,
            name: i === 0 ? 'Deep confident narrator' : `Actor ${i}`,
          })),
        },
      });
    } else {
      calls.push(route.request().postDataJSON());
      await route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('fixture audio') });
    }
  });
  await page.goto('/');
  await page.getByText('Audio settings', { exact: false }).first().click();
  await page.getByLabel('Speech engine').selectOption('cloud');
  await page.getByRole('button', { name: 'Connect ElevenLabs', exact: true }).click();
  await expect(page.getByLabel('Voice for therapist')).toHaveValue('actor0');
  await expect(page.getByRole('region', { name: 'Voice studio' })).toContainText(
    '13 distinct voices assigned',
  );
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toMatchObject({ voiceId: 'actor0', therapist: true });
  await expect(page.locator('.caption-copy>p[aria-hidden]')).toContainText('Welcome');
  await page.evaluate(() => (window as any).__players.at(-1).onended());
  await expect.poll(() => calls.length).toBe(2);
  expect(calls[1].voiceId).not.toBe(calls[0].voiceId);
  expect(calls[1].therapist).toBe(false);
  await page.getByRole('button', { name: 'Pause session' }).click();
  expect(await page.evaluate(() => (window as any).__players.at(-1).paused)).toBe(true);
  const count = calls.length;
  await page.waitForTimeout(250);
  expect(calls.length).toBe(count);
  await page.getByRole('button', { name: 'Resume session' }).click();
  await expect.poll(() => calls.length).toBe(count + 1);
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await page.screenshot({
    path: `artifacts/${info.project.name}-voice-studio.png`,
    fullPage: true,
  });
});

test('missing cloud service explains setup without silently speaking with a device voice', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:4317/**', (route) =>
    route.fulfill({ status: 503, json: { error: 'Set ELEVENLABS_API_KEY in .env' } }),
  );
  await page.goto('/');
  await page.getByText('Audio settings', { exact: false }).first().click();
  await page.getByLabel('Speech engine').selectOption('cloud');
  await page.getByRole('button', { name: 'Connect ElevenLabs', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Voice studio' })).toContainText(
    'Set ELEVENLABS_API_KEY',
  );
  await expect(page.getByLabel('Speech engine')).toHaveValue('cloud');
});

test('all twelve labels stay clear of other character art', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  const overlaps = await page.locator('.theater').evaluate((stage) => {
    const labels = [...stage.querySelectorAll('.character-name')].map((e) =>
      e.getBoundingClientRect(),
    );
    const rigs = [...stage.querySelectorAll('.character > .tab-rig')].map((e) =>
      e.getBoundingClientRect(),
    );
    return labels.flatMap((a, i) =>
      rigs.flatMap((b, j) =>
        i !== j && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
          ? [`${i}:${j}`]
          : [],
      ),
    );
  });
  expect(overlaps).toEqual([]);
});
