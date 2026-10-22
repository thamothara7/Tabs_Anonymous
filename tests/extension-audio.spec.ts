import { test, expect, chromium } from './fixtures';
import { mkdtemp, cp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createVoiceServer } from '../apps/voice-server/server';
import { KOKORO_VOICES } from '../packages/ui/voices';

test('native extension connects to Kokoro without Origin and sends AI dialogue to the correct voice', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop extension only.');
  const root = await mkdtemp(join(tmpdir(), 'tabs-native-audio-'));
  const extension = join(root, 'extension');
  await cp(resolve('dist-extension'), extension, { recursive: true });
  const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  manifest.background = { service_worker: 'test.js' };
  await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(join(extension, 'test.js'), 'chrome.runtime.onInstalled.addListener(()=>{});');
  const context = await chromium.launchPersistentContext(join(root, 'profile'), {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  let server: ReturnType<typeof createVoiceServer> | undefined;
  const speech: any[] = [];
  const headers: any[] = [];
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const id = new URL(worker.url()).hostname;
    server = createVoiceServer({
      origins: [`chrome-extension://${id}`],
      kokoro: {
        voices: async () => KOKORO_VOICES,
        speak: async (input) => {
          speech.push(input);
          return Buffer.from('fixture');
        },
        close() {},
      },
      writer: {
        ready: async () => {},
        generate: async () => ({
          line: 'Your tabs called this meeting. The duplicate has brought its own understudy.',
          emotion: 'neutral',
          source: 'local-ai',
          model: 'fixture',
        }),
      },
    });
    server.on('request', (req) => headers.push(req.headers));
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;
    for (const file of await readdir(join(extension, 'assets')))
      if (file.endsWith('.js')) {
        const path = join(extension, 'assets', file);
        await writeFile(
          path,
          (await readFile(path, 'utf8')).replaceAll('127.0.0.1:4317', `127.0.0.1:${port}`),
        );
      }
    const page = await context.newPage();
    await page.addInitScript(() => {
      (window as any).Audio = class {
        volume = 1;
        onended = null;
        onerror = null;
        play() {
          return Promise.resolve();
        }
        pause() {}
        removeAttribute() {}
        load() {}
      };
    });
    await page.goto(`chrome-extension://${id}/index.html#arena`);
    await page.getByRole('button', { name: 'Try the fictional demo' }).click();
    await page.getByRole('button', { name: 'Sound off', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start therapy' }).click();
    await expect.poll(() => speech.length).toBeGreaterThanOrEqual(1);
    expect(speech[0]).toMatchObject({
      voiceId: 'bm_george',
      therapist: true,
      text: expect.stringContaining('brought its own understudy'),
    });
    expect(headers.some((h) => !h.origin && h['x-ta-extension-id'] === id)).toBe(true);
    await expect(page.locator('.caption-copy [role="status"]')).toContainText(
      'brought its own understudy',
    );
    await page.screenshot({ path: 'artifacts/native-ai-audio.png', fullPage: true });
  } finally {
    await context.close();
    if (server) await new Promise<void>((r) => server!.close(() => r()));
    await rm(root, { recursive: true, force: true });
  }
});
