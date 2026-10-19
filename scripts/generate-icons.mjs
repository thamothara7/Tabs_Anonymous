import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
// Rasterize the existing vector brand mark. Run only when the logo changes.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const svg = await readFile('public/favicon.svg', 'utf8');
  await mkdir('public/icons', { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: `public/icons/icon-${size}.png`, omitBackground: true });
  }
} finally {
  await browser.close();
}
