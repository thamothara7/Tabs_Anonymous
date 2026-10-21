import { test as base, expect, chromium } from '@playwright/test';
export { expect, chromium };
export type { Page } from '@playwright/test';
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('http://127.0.0.1:4317/dialogue', (route) =>
      route.fulfill({
        status: 503,
        json: { error: 'Local AI is unavailable in this scripted test.' },
      }),
    );
    await use(page);
  },
});
