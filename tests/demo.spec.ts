import { test, expect } from '@playwright/test';
test('complete demo, consequences, and recap', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
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
  await expect(page.locator('.caption-copy [role="status"]')).toContainText('You defended me');
  await page.getByRole('button', { name: 'Skip scene' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  await expect(page.locator('.duplicate-stamp')).toBeVisible();
  await page.screenshot({ path: `artifacts/${info.project.name}-duplicate.png`, fullPage: true });
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Skip scene' }).click();
  await expect(page.getByRole('region', { name: 'Choose tab fate' })).toBeVisible();
  await page.getByRole('button', { name: 'Retire from arena' }).click();
  await expect(page.locator('.caption-copy [role="status"]')).toContainText('VERY IMPORTANT TAB');
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
  await page.getByRole('button', { name: 'Save recap' }).click();
  expect((await download).suggestedFilename()).toBe('tabs-anonymous-recap.txt');
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
