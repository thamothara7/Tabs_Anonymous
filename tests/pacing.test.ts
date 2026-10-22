import { it, expect, vi, afterEach } from 'vitest';
import { DialogueClient } from '../packages/ui/dialogueClient';
import { dialogueContext } from '../packages/ui/useDialogue';
import { initialState } from '../packages/game-core/reducer';
import { demoCharacters } from '../packages/game-core/fixtures';
import { SessionAudio, lineDuration } from '../packages/ui/audio';
import { recapText, sessionHighlights } from '../packages/ui/recap';
afterEach(() => vi.unstubAllGlobals());
it('promotes a prepared dialogue request without waiting for another generation and cancels obsolete turns', async () => {
  const resolve: ((r: Response) => void)[] = [];
  const fetcher = vi.fn(
    (_url: string, _init: RequestInit) => new Promise<Response>((r) => resolve.push(r)),
  );
  vi.stubGlobal('fetch', fetcher);
  const client = new DialogueClient(),
    input = dialogueContext(initialState(demoCharacters), 'therapist', null, 'Intro');
  const first = client.request('next', input);
  client.retain('next');
  const promoted = client.request('next', input);
  expect(promoted).toBe(first);
  expect(fetcher).toHaveBeenCalledOnce();
  resolve[0](
    Response.json({
      line: 'Two copies of one problem. Neither has an answer.',
      emotion: 'neutral',
      source: 'local-ai',
    }),
  );
  await expect(promoted).resolves.toHaveProperty('source', 'local-ai');
  const stale = client.request('obsolete', input).catch(() => null);
  client.retain('new-turn');
  expect(fetcher.mock.calls[1][1].signal?.aborted).toBe(true);
  resolve[1](
    Response.json({
      line: 'Never play this obsolete line.',
      emotion: 'neutral',
      source: 'local-ai',
    }),
  );
  expect(await stale).toBe(null);
});
it('prepared speech is reused without a second generation request', async () => {
  const fetcher = vi.fn(async () => new Response('RIFFsample'));
  vi.stubGlobal('fetch', fetcher);
  const play = vi.fn(async () => {});
  vi.stubGlobal(
    'Audio',
    class {
      play = play;
      pause() {}
      removeAttribute() {}
      load() {}
    },
  );
  const audio = new SessionAudio();
  audio.prefetch('Ready before my cue.', 'bm_george', 'neutral', true);
  await audio.speak('Ready before my cue.', 'bm_george', 'neutral', true, vi.fn(), vi.fn());
  expect(fetcher).toHaveBeenCalledOnce();
  expect(play).toHaveBeenCalledOnce();
  audio.dispose();
  expect(lineDuration('One short reply.')).toBeLessThan(3000);
});
it('text recap includes unquoted AI dialogue, full titles and outcomes without duplicate lines or URLs', () => {
  const state = initialState(
    demoCharacters.map((c, i) => ({
      ...c,
      title: i === 0 ? 'A complete title much longer than the character name' : c.title,
      fate: i < 3 ? 'keep' : 'retire',
    })),
  );
  state.history = [
    'Therapist: Your duplicate brought a second lawyer.',
    'Therapist: Your duplicate brought a second lawyer.',
    'LeetCode: My alibi is at https://private.test/secret?token=abc',
  ];
  const output = recapText(state);
  expect(output).toContain('A complete title much longer');
  expect(output).toContain('3 kept, 0 grouped, 9 retired');
  expect(output).toContain('Your duplicate brought a second lawyer.');
  expect(output).not.toMatch(/https:|token=abc/);
  expect(sessionHighlights(state)).toHaveLength(2);
});
