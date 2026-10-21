import { test, expect } from './fixtures';

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
