import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';
test('complete demo, consequences, and recap', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      if (type === 'image/png') {
        const count = Number(document.documentElement.dataset.pngEncodes ?? 0);
        document.documentElement.dataset.pngEncodes = String(count + 1);
      }
      return original.call(this, callback, type, quality);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Too many tabs. Too many feelings.' }),
  ).toBeVisible();
  await page.screenshot({ path: `artifacts/${info.project.name}-lobby.png`, fullPage: true });
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await expect(page.getByRole('button', { name: 'Select LeetCode', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Defend', exact: true }).click();
  await expect(page.locator('.meters')).toContainText('60%');
  await expect(page.locator('.caption-copy [role="status"]')).toContainText('LeetCode');
  await page.getByRole('button', { name: 'Skip scene' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  await expect(page.locator('.duplicate-stamp')).toBeVisible();
  await page.screenshot({ path: `artifacts/${info.project.name}-duplicate.png`, fullPage: true });
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  await expect(page.getByRole('region', { name: 'Choose tab fate' })).toBeVisible();
  await page.getByRole('button', { name: 'Retire from arena' }).click();
  await expect(page.locator('.caption-copy [role="status"]')).toContainText('LeetCode');
  for (let i = 1; i < 12; i++) {
    await page.getByRole('button', { name: 'Next undecided' }).click();
    await page
      .getByRole('button', { name: i < 5 ? 'Keep in the spotlight' : 'Find their people' })
      .click();
  }
  await page.screenshot({ path: `artifacts/${info.project.name}-vote.png`, fullPage: true });
  await page.getByRole('button', { name: 'The awards ceremony' }).click();
  await expect(page.getByRole('heading', { name: 'The Betrayer', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save text recap' }).click();
  expect((await download).suggestedFilename()).toBe('tabs-anonymous-recap.txt');
  const cardDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PNG card', exact: true }).click();
  const card = await cardDownload;
  expect(card.suggestedFilename()).toBe('tabs-anonymous-award.png');
  await card.saveAs(`artifacts/${info.project.name}-award.png`);
  const png = await readFile(`artifacts/${info.project.name}-award.png`);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(2400);
  expect(png.readUInt32BE(20)).toBe(1350);
  await expect(page.locator('.png-award img')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('html')).toHaveAttribute('data-png-encodes', '1');
  await expect(page.getByRole('button', { name: 'Save SVG', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `artifacts/${info.project.name}-results.png`, fullPage: true });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('pause freezes captions and motion preference persists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await page.getByRole('button', { name: 'Pause session' }).click();
  const text = await page.locator('.caption-copy>p[aria-hidden]').textContent();
  await page.waitForTimeout(600);
  await expect(page.locator('.caption-copy>p[aria-hidden]')).toHaveText(text!);
  await expect(page.locator('.app')).toHaveClass(/is-paused/);
  await page.getByRole('button', { name: 'Resume session' }).click();
  await expect
    .poll(() => page.locator('.caption-copy>p[aria-hidden]').textContent())
    .not.toBe(text);
  await page.getByRole('button', { name: 'Full motion', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('privacy dialog traps focus and restores the session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Privacy, please' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Use my real tabs' }).click();
  await expect(page.getByRole('dialog')).toContainText('Load unpacked');
});
test('dragging a tab into a fate zone works on a scrolled page', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Mobile has equivalent accessible button controls.');
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  await page.getByRole('button', { name: 'Pause session' }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await page.evaluate(() => window.scrollTo(0, 100));
  const character = page.getByRole('button', { name: 'Select LeetCode', exact: true });
  const zone = page.getByRole('button', { name: 'Keep in the spotlight' });
  await character.dragTo(zone);
  await expect(zone).toContainText('1 / 6');
});
test('voting stays reachable, supports undo, and survives reload', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  const panel = page.getByRole('region', { name: 'Choose tab fate' });
  await expect(panel).toBeVisible();
  if (info.project.name === 'mobile') {
    const bounds = await panel.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  } else {
    const theater = await page.getByTestId('theater').boundingBox();
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThan(theater!.x + theater!.width);
  }
  await page.getByRole('button', { name: 'Keep in the spotlight', exact: true }).click();
  await page.reload();
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Keep in the spotlight', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Undo last verdict' }).click();
  await expect(page.getByRole('progressbar', { name: 'Verdicts completed' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await panel.focus();
  await page.keyboard.press('2');
  await expect(
    page.getByRole('button', { name: 'Find their people', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({
    path: `artifacts/${info.project.name}-phase-two-vote.png`,
    fullPage: info.project.name !== 'mobile',
  });
});
test('reload during a scene resumes paused and restarting clears progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await page.getByRole('button', { name: 'Skip scene' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume session' })).toBeVisible();
  await expect(page.locator('.resume-banner')).toContainText('Session restored');
  await page.getByRole('button', { name: 'Restart session' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start therapy' })).toBeVisible();
});
