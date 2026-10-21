import { test, expect, chromium } from './fixtures';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('native Chromium grouping, cancel, protected tabs, and reload recovery', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'The extension targets desktop Chromium.');
  test.setTimeout(60000);
  const root = await mkdtemp(join(tmpdir(), 'tabs-anonymous-native-test-'));
  const extension = join(root, 'extension');
  await cp(resolve('dist-extension'), extension, { recursive: true });
  const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
  // Isolated test profile only: pregrant permissions to test native APIs without an OS dialog.
  // The distributed manifest keeps these permissions optional and has no background worker.
  manifest.permissions = ['tabs', 'tabGroups'];
  manifest.optional_permissions = [];
  manifest.background = { service_worker: 'test-background.js' };
  await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(
    join(extension, 'test-background.js'),
    'chrome.runtime.onInstalled.addListener(() => {});',
  );
  const context = await chromium.launchPersistentContext(join(root, 'profile'), {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    await context.route('http://127.0.0.1:4317/dialogue', (route) =>
      route.fulfill({ status: 503, json: { error: 'Scripted test.' } }),
    );
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const id = new URL(worker.url()).hostname;
    const first = await context.newPage();
    await first.goto('http://127.0.0.1:4173/?fixture=event');
    await first.evaluate(() => {
      document.title = 'Local hackathon overview';
    });
    const second = await context.newPage();
    await second.goto('http://127.0.0.1:4173/?fixture=study');
    await second.evaluate(() => {
      document.title = 'Java DSA Study Guide';
    });
    const pinned = await context.newPage();
    await pinned.goto('http://127.0.0.1:4173/?fixture=pinned');
    const arena = await context.newPage();
    await arena.goto(`chrome-extension://${id}/index.html#arena`);
    expect(
      await arena.evaluate(async () => {
        const icon = chrome.runtime.getManifest().icons?.['32'];
        if (!icon) return false;
        const image = new Image();
        image.src = chrome.runtime.getURL(icon);
        await image.decode();
        return image.naturalWidth === 32 && image.naturalHeight === 32;
      }),
    ).toBe(true);
    await arena.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const pinned = tabs.find((t) => t.url?.includes('fixture=pinned'))!;
      await chrome.tabs.update(pinned.id!, { pinned: true });
    });
    await arena.emulateMedia({ reducedMotion: 'reduce' });
    await arena.getByRole('button', { name: 'Connect this window' }).click();
    await expect(arena.locator('.extension-banner')).toContainText('2 eligible tabs');
    await arena.getByRole('button', { name: 'Start therapy' }).click();
    await arena
      .getByRole('button', { name: 'Select Local hackathon overview', exact: true })
      .click();
    await arena.getByRole('button', { name: 'Hear their excuse' }).click();
    await expect(arena.locator('.caption-copy [role="status"]')).toContainText(
      'Local hackathon overview',
    );
    await arena.getByRole('button', { name: 'Skip scene' }).click();
    for (let i = 0; i < 10; i++) await arena.getByRole('button', { name: 'Skip scene' }).click();
    await arena.getByRole('button', { name: 'Find their people', exact: true }).click();
    await arena.reload();
    await expect(arena.getByRole('region', { name: 'Choose tab fate' })).toBeVisible();
    await expect(
      arena.getByRole('button', { name: 'Find their people', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await arena.getByRole('button', { name: 'Next undecided' }).click();
    await arena.getByRole('button', { name: 'Keep in the spotlight', exact: true }).click();
    await arena.getByRole('button', { name: 'The awards ceremony' }).click();
    const imageDownload = arena.waitForEvent('download');
    await arena.getByRole('button', { name: 'Save recap card' }).click();
    expect((await imageDownload).suggestedFilename()).toBe('tabs-anonymous-award.png');
    await arena.getByRole('button', { name: 'Preview native groups' }).click();
    await expect(arena.locator('.native-preview')).toContainText('Big opportunities');
    await expect(arena.locator('.native-preview')).toContainText('Big plans');
    await arena.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await arena.evaluate(async () => (await chrome.tabGroups.query({})).length)).toBe(0);
    await arena.getByRole('button', { name: 'Preview native groups' }).click();
    await arena.screenshot({ path: 'artifacts/native-group-preview.png', fullPage: true });
    await arena.getByRole('button', { name: 'Apply to 2 real tabs' }).click();
    await expect(arena.locator('.native-preview')).toContainText('Approved groups applied');
    const after = await arena.evaluate(async () => ({
      tabs: await chrome.tabs.query({}),
      groups: await chrome.tabGroups.query({}),
    }));
    expect(after.groups.map((g) => g.title).sort()).toEqual(['Big opportunities', 'Big plans']);
    expect(after.tabs.find((t) => t.url?.includes('fixture=pinned'))?.groupId).toBe(-1);
    expect(after.tabs.filter((t) => t.url?.includes('fixture='))).toHaveLength(3);
    // A changed URL must invalidate restore rather than blindly reviving the old snapshot.
    await first.goto('http://127.0.0.1:4173/?fixture=navigated');
    await arena.reload();
    await expect(arena.getByRole('alert')).toContainText('Your tabs changed');
    await expect(arena.getByRole('button', { name: 'Connect this window' })).toBeVisible();
    await arena.getByRole('button', { name: 'Connect this window' }).click();
    await arena.getByRole('button', { name: 'Start therapy' }).click();
    // Explicit refresh captures newly opened tabs and clears fictional verdicts.
    const newcomer = await context.newPage();
    await newcomer.goto('http://127.0.0.1:4173/?fixture=newcomer');
    await newcomer.evaluate(() => {
      document.title = 'Rust ownership workshop';
    });
    await arena.getByRole('button', { name: 'Refresh cast and restart' }).click();
    await expect(arena.locator('.extension-banner')).toContainText('3 eligible tabs');
    await expect(arena.getByRole('button', { name: 'Start therapy' })).toBeVisible();
    await arena.getByRole('button', { name: 'Start therapy' }).click();
    await arena
      .getByRole('button', { name: 'Select Rust ownership workshop', exact: true })
      .click();
    await arena.getByRole('button', { name: 'Hear their excuse' }).click();
    await expect(arena.locator('.caption-copy [role="status"]')).toContainText(
      'Rust ownership workshop',
    );
    await arena.getByRole('button', { name: 'Forget session' }).click();
    await expect(arena.getByRole('button', { name: 'Connect this window' })).toBeVisible();
    expect(
      await arena.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('ta-'))),
    ).toEqual([]);
    expect(await arena.evaluate(async () => (await chrome.tabGroups.query({})).length)).toBe(2);
  } finally {
    await context.close();
    await rm(root, { recursive: true, force: true });
  }
});
