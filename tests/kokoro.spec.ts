import { test, expect } from '@playwright/test';
test('Kokoro casts automatically and speaks character reactions with distinct voices', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
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
  const calls: { voiceId: string; emotion: string; therapist: boolean }[] = [];
  await page.route('http://127.0.0.1:4317/**', async (route) => {
    expect(route.request().url()).toContain('/kokoro/speech');
    calls.push(route.request().postDataJSON());
    await route.fulfill({ contentType: 'audio/wav', body: Buffer.from('fixture') });
  });
  await page.goto('/');
  await page.getByText('Audio settings', { exact: false }).first().click();
  await expect(page.getByLabel('Speech engine')).toHaveValue('kokoro');
  await expect(page.getByLabel('Voice for therapist')).toHaveValue('bm_george');
  const cast = await page
    .locator('.voice-cast-row select')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLSelectElement).value));
  expect(new Set(cast).size).toBe(13);
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toMatchObject({ voiceId: 'bm_george', therapist: true });
  await page.evaluate(() => (window as any).__localPlayers.at(-1).onended());
  await expect.poll(() => calls.length).toBe(2);
  expect(calls[1].voiceId).not.toBe('bm_george');
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.emotion).toBe('angry');
  const tabVoice = calls.at(-1)!.voiceId;
  await page.getByRole('button', { name: 'Defend', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.emotion).toBe('victorious');
  expect(calls.at(-1)?.voiceId).toBe(tabVoice);
  await page.getByRole('button', { name: 'Pause session' }).click();
  expect(await page.evaluate(() => (window as any).__localPlayers.at(-1).paused)).toBe(true);
  await page.reload();
  await page.getByText('Audio settings', { exact: false }).first().click();
  await expect(page.getByLabel('Voice for therapist')).toHaveValue('bm_george');
  await page.getByLabel('Preview delivery').selectOption('suspicious');
  await page.locator('.voice-cast-row').nth(1).getByRole('button', { name: 'Preview' }).click();
  await expect.poll(() => calls.at(-1)?.emotion).toBe('suspicious');
  await page.screenshot({ path: `artifacts/${info.project.name}-kokoro.png`, fullPage: true });
});
