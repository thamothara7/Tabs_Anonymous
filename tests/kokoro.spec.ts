import { test, expect } from '@playwright/test';
import { KOKORO_VOICES } from '../packages/ui/voices';

test('one sound control automatically casts Kokoro and keeps witness voices and reactions distinct', async ({
  page,
}, info) => {
  await page.clock.install();
  await page.addInitScript(() => {
    // A previous manual cast must not override the automatic therapist or duplicate tab voices.
    localStorage.setItem(
      'ta-kokoro-casting-v1',
      JSON.stringify({
        voices: [{ id: 'bm_fable', name: 'Fable' }],
        map: { therapist: 'bm_fable', 'tab-0': 'bm_fable' },
      }),
    );
    (window as any).__localPlayers = [];
    (window as any).Audio = class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      volume = 1;
      paused = false;
      constructor(public src: string) {
        (window as any).__localPlayers.push(this);
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
  const calls: { voiceId: string; emotion: string; therapist: boolean; text: string }[] = [];
  await page.route('http://127.0.0.1:4317/**', async (route) => {
    if (route.request().url().endsWith('/kokoro/voices')) {
      await route.fulfill({ json: { voices: KOKORO_VOICES } });
    } else {
      expect(route.request().url()).toContain('/kokoro/speech');
      calls.push(route.request().postDataJSON());
      await route.fulfill({ contentType: 'audio/wav', body: Buffer.from('fixture') });
    }
  });
  await page.goto('/');
  await expect(page.getByText('Audio settings')).toHaveCount(0);
  await expect(page.getByLabel('Speech engine')).toHaveCount(0);
  await expect(page.locator('select')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toMatchObject({ voiceId: 'bm_george', therapist: true });
  await expect(page.locator('.caption-copy>p[aria-hidden]')).toContainText('Welcome');
  await page.evaluate(() => (window as any).__localPlayers.at(-1).onended());
  await expect.poll(() => calls.length).toBe(2);
  const tabVoice = calls[1].voiceId;
  expect(tabVoice).not.toBe('bm_george');
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.emotion).toBe('angry');
  await page.getByRole('button', { name: 'Defend', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.emotion).toBe('victorious');
  expect(calls.at(-1)?.voiceId).toBe(tabVoice);
  await page.getByRole('button', { name: 'Call a witness', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.text).toContain('testifying about');
  expect(calls.at(-1)?.voiceId).not.toBe(tabVoice);
  expect(calls.at(-1)?.voiceId).not.toBe('bm_george');
  expect(calls.at(-1)?.emotion).toBe('suspicious');
  const heldCount = calls.length;
  await page.clock.fastForward(60000);
  expect(calls.length).toBe(heldCount);
  await expect(page.locator('.caption-copy [role="status"]')).toContainText('testifying about');
  await expect(page.locator('.comedy-controls')).toContainText('Selected tab: LeetCode');
  await page.getByRole('button', { name: 'Pause session' }).click();
  expect(await page.evaluate(() => (window as any).__localPlayers.at(-1).paused)).toBe(true);
  const count = calls.length;
  await page.waitForTimeout(250);
  expect(calls.length).toBe(count);
  await page.getByRole('button', { name: 'Resume session' }).click();
  await expect.poll(() => calls.length).toBe(count + 1);
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__localPlayers.at(-1).paused)).toBe(true);
  await page.screenshot({
    path: `artifacts/${info.project.name}-automatic-kokoro.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unavailable Kokoro has a compact retry and never falls back to browser speech', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__synthCalls = 0;
    speechSynthesis.speak = () => {
      (window as any).__synthCalls++;
    };
  });
  let available = false;
  await page.route('http://127.0.0.1:4317/**', (route) =>
    route.fulfill(
      available
        ? { json: { voices: KOKORO_VOICES } }
        : { status: 503, json: { error: 'Worker unavailable' } },
    ),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(page.locator('.sound-status')).toContainText('Kokoro is unavailable');
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toBeVisible();
  available = true;
  await page.getByRole('button', { name: 'Retry sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toBeVisible();
  await expect(page.locator('.sound-status')).toContainText('George leads');
  expect(await page.evaluate(() => (window as any).__synthCalls)).toBe(0);
});

test('canceling startup ignores a delayed readiness response', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('http://127.0.0.1:4317/**', async (route) => {
    await held;
    await route.fulfill({ json: { voices: KOKORO_VOICES } }).catch(() => {});
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel voice startup', exact: true }).click();
  release();
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toBeVisible();
  await expect(page.locator('.sound-status')).toContainText('Sound off');
});
