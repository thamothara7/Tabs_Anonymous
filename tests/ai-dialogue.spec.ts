import { test, expect } from './fixtures';

test('AI improvises each turn with recent conversation and keeps generated captions on screen', async ({
  page,
}) => {
  const requests: any[] = [];
  await page.route('http://127.0.0.1:4317/dialogue', async (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    await route.fulfill({
      json: {
        line:
          input.speaker === 'therapist'
            ? 'The coding tabs brought algorithms. The shopping cart brought a very creative definition of research.'
            : 'You call that research? My duplicate and I demand separate performance reviews.',
        emotion: input.speaker === 'therapist' ? 'neutral' : 'suspicious',
        source: 'local-ai',
        model: 'qwen3:4b',
      },
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await expect(page.locator('.caption-copy [role="status"]')).toContainText(
    'very creative definition',
  );
  await expect(page.locator('.dialogue-status')).toContainText('AI dialogue');
  await page.getByRole('button', { name: 'Call a witness' }).click();
  await expect(page.locator('.caption-copy [role="status"]')).toContainText(
    'separate performance reviews',
  );
  expect(requests.at(-1).speaker).toBe('tab-5');
  expect(requests.at(-1).target).toBe('tab-0');
  expect(requests.at(-1).recent.join(' ')).toContain('very creative definition');
  expect(JSON.stringify(requests.at(-1))).not.toContain('/problems/two-sum');
  await page.getByRole('button', { name: 'Pause session', exact: true }).click();
  await expect(page.locator('.caption-copy p[aria-hidden="true"]')).toContainText(
    'separate performance reviews',
  );
});

test('late AI responses cannot overwrite an interrupted turn, and scripted fallback remains explicit', async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  let count = 0;
  await page.route('http://127.0.0.1:4317/dialogue', async (route) => {
    const n = ++count;
    if (n === 1) await held;
    await route
      .fulfill({
        json: {
          line:
            n === 1
              ? 'This obsolete host line must never replace the current witness.'
              : 'The witness has the floor, and a suspiciously detailed alibi.',
          emotion: 'suspicious',
          source: 'local-ai',
        },
      })
      .catch(() => {});
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await expect.poll(() => count).toBe(1);
  await expect(page.locator('.caption-copy [role="status"]')).toContainText('improvising');
  await page.getByRole('button', { name: 'Call a witness' }).click();
  await expect(page.locator('.caption-copy [role="status"]')).toContainText(
    'witness has the floor',
  );
  release();
  await expect(page.locator('.caption-copy [role="status"]')).not.toContainText('obsolete');
  await page.getByRole('button', { name: 'AI dialogue on', exact: true }).click();
  await expect(page.locator('.dialogue-status')).toContainText('Scripted dialogue');
});

test('a failed local writer continues with captions and provides a retry without changing votes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy' }).click();
  await expect(page.locator('.dialogue-status')).toContainText('Scripted dialogue is continuing');
  await expect(page.getByRole('button', { name: 'Retry AI dialogue' })).toBeVisible();
  await expect(page.locator('.caption-copy [role="status"]')).toContainText(
    'Welcome to Tabs Anonymous',
  );
  await page.route('http://127.0.0.1:4317/dialogue', (route) =>
    route.fulfill({
      json: {
        line: 'We are back. The duplicate has already filed a second complaint.',
        emotion: 'neutral',
        source: 'local-ai',
      },
    }),
  );
  await page.getByRole('button', { name: 'Retry AI dialogue' }).click();
  await expect(page.locator('.caption-copy [role="status"]')).toContainText('We are back');
});

test('prepares the next turn during the current line and reuses it after Skip', async ({
  page,
}) => {
  const requests: any[] = [];
  await page.route('http://127.0.0.1:4317/dialogue', async (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    await route.fulfill({
      json: {
        line:
          input.speaker === 'therapist'
            ? 'The host is ready. This meeting has a surprising number of duplicate opinions.'
            : 'My next reply was ready before you handed me the microphone.',
        emotion: 'neutral',
        source: 'local-ai',
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start therapy', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].recent.join(' ')).toContain('duplicate opinions');
  const preparedSpeaker = requests[1].speaker;
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click();
  await expect(page.locator('.caption-copy p[aria-hidden="true"]')).toContainText(
    'ready before you handed',
  );
  expect(
    requests.filter((r) => r.speaker === preparedSpeaker && r.scene === requests[1].scene),
  ).toHaveLength(1);
});
