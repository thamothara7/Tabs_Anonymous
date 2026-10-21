import { test, expect } from './fixtures';

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
