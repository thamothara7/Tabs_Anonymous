import { test, expect } from '@playwright/test';

test('roast, balcony, and recovery keep every character reachable', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await page.getByRole('button', { name: 'Roast this tab' }).click();
  const line = await page.locator('.caption-copy [role="status"]').textContent();
  await page.getByRole('button', { name: 'Roast this tab' }).click();
  await expect(page.locator('.caption-copy [role="status"]')).not.toHaveText(line!);
  await page.getByRole('button', { name: 'Skip scene' }).click();
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: 'Retire from arena' }).click();
    if (i !== 11) await page.getByRole('button', { name: 'Next undecided' }).click();
  }
  const tray = page.getByRole('region', { name: 'Retired cast' });
  await expect(tray.getByRole('button')).toHaveCount(12);
  await expect(page.locator('.theater .seat')).toHaveCount(0);
  await tray.getByRole('button', { name: 'Select LeetCode', exact: true }).click();
  await page.getByRole('button', { name: 'Keep in the spotlight', exact: true }).click();
  await expect(tray.getByRole('button')).toHaveCount(11);
  await expect(page.locator('.theater .seat')).toHaveCount(1);
  await page.reload();
  await expect(tray.getByRole('button')).toHaveCount(11);
  await page.screenshot({ path: `artifacts/${info.project.name}-balcony.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('sound starts a real audio context and exposes volume and voice fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    (window as any).__audio = [];
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super();
        (window as any).__audio.push(this);
      }
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.evaluate(() => (window as any).__audio.at(-1).state)).toBe('running');
  await page.getByText('Audio settings', { exact: false }).first().click();
  await expect(page.getByLabel('Sound volume')).toHaveValue('65');
  await expect(page.getByLabel('Local voice')).toBeVisible();
  await page.getByLabel('Local voice').selectOption('off');
  await page.getByRole('button', { name: 'Test sound', exact: true }).click();
  await expect(page.locator('.audio-settings')).toContainText('Sound ready');
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('local dialogue speech stops on pause and mute and follows the selected roast', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const events = new EventTarget();
    const calls: { text: string; voice: string }[] = [];
    (window as any).__speechCalls = calls;
    (window as any).__speechCancels = 0;
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [
          { name: 'Test local English', voiceURI: 'local-test', lang: 'en-US', localService: true },
          { name: 'Remote excluded', voiceURI: 'remote', lang: 'en-US', localService: false },
        ],
        speak: (utterance: any) =>
          calls.push({ text: utterance.text, voice: utterance.voice.voiceURI }),
        cancel: () => {
          (window as any).__speechCancels++;
        },
        resume: () => {},
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
      },
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: class {
        constructor(public text: string) {}
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__speechCalls.length))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__speechCalls.at(-1))).toEqual(
    expect.objectContaining({ text: expect.stringContaining('12 tabs'), voice: 'local-test' }),
  );
  await page.getByRole('button', { name: 'Roast this tab' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__speechCalls.at(-1).text))
    .toContain('LeetCode');
  const before = await page.evaluate(() => (window as any).__speechCancels);
  await page.getByRole('button', { name: 'Pause session' }).click();
  expect(await page.evaluate(() => (window as any).__speechCancels)).toBeGreaterThan(before);
  const count = await page.evaluate(() => (window as any).__speechCalls.length);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__speechCalls.length)).toBe(count);
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  expect(await page.evaluate(() => (window as any).__speechCalls.length)).toBe(count);
});
