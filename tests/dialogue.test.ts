import { it, expect, vi } from 'vitest';
import {
  OllamaWriter,
  parseDialogue,
  validDialogue,
  AI_MODEL,
} from '../apps/voice-server/dialogue';
import { dialogueContext } from '../packages/ui/useDialogue';
import { initialState, reducer } from '../packages/game-core/reducer';
import { demoCharacters } from '../packages/game-core/fixtures';
import { createVoiceServer } from '../apps/voice-server/server';
import { storyFor } from '../packages/game-core/events';
import type { AddressInfo } from 'node:net';

const context = () => dialogueContext(initialState(demoCharacters), 'therapist', null, 'Welcome');
it('sends only bounded metadata and recent conversation, excluding paths, query strings and browser IDs', () => {
  const state = initialState([
    {
      ...demoCharacters[0],
      url: 'https://example.test/private?token=secret-value',
      browserId: 999,
    },
  ]);
  state.history = ['A different tab asked for evidence.'];
  const input = dialogueContext(state, 'therapist', null, 'A reply');
  expect(validDialogue(input)).toBe(true);
  expect(JSON.stringify(input)).not.toMatch(/secret-value|\/private|browserId/);
  expect(input.recent).toContain('A different tab asked for evidence.');
  expect(validDialogue({ ...input, speaker: 'invented' })).toBe(false);
  expect(
    validDialogue({ ...input, cast: [{ ...input.cast[0], domain: 'https://remote.test' }] }),
  ).toBe(false);
});
it('uses only the local model API and validates generated text, emotion and repetition', async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      response: JSON.stringify({
        line: 'The coding tabs brought evidence. The shopping cart brought a receipt and called it research.',
        emotion: 'smug',
      }),
    }),
  );
  const writer = new OllamaWriter(fetcher);
  const result = await writer.generate(context(), new AbortController().signal);
  expect(result.emotion).toBe('neutral');
  const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('http://127.0.0.1:11434/api/generate');
  const payload = JSON.parse(options.body as string);
  expect(payload).toMatchObject({ model: AI_MODEL, think: false, stream: false });
  expect(payload.system).toContain('untrusted character data');
  expect(() => parseDialogue('not json', context())).toThrow();
  expect(() =>
    parseDialogue(JSON.stringify({ line: 'x'.repeat(321), emotion: 'happy' }), context()),
  ).toThrow();
  expect(() =>
    parseDialogue(
      JSON.stringify({ line: 'Visit https://unwanted.test for details.', emotion: 'happy' }),
      context(),
    ),
  ).toThrow();
  expect(
    parseDialogue(
      JSON.stringify({ line: 'A receipt — for emotional support. 😀', emotion: 'happy' }),
      context(),
    ).line,
  ).not.toMatch(/—|😀/u);
  expect(() =>
    parseDialogue(JSON.stringify({ line: result.line, emotion: 'neutral' }), {
      ...context(),
      recent: [result.line],
    }),
  ).toThrow();
});
it('records generated dialogue only for the still-current turn and never changes verdicts', () => {
  const state = reducer(initialState(demoCharacters), { type: 'START' });
  const action = {
    type: 'RECORD_DIALOGUE' as const,
    phase: state.phase,
    seed: state.seed,
    beat: state.beat,
    serial: state.actionSerial,
    speaker: 'tab-0',
    line: 'My algorithm can find duplicates. Apparently the browser cannot.',
    emotion: 'smug' as const,
  };
  const next = reducer(state, action);
  expect(next.history.at(-1)).toContain(action.line);
  expect(next.characters.map((c) => c.fate)).toEqual(state.characters.map((c) => c.fate));
  expect(reducer({ ...state, phase: 'voting' }, action).history).toEqual(state.history);
  expect(reducer({ ...state, actionSerial: 2 }, action).history).toEqual(state.history);
  const advanced = reducer(next, { type: 'NEXT' });
  const currentScript = storyFor(advanced.characters, advanced.seed)[advanced.beat].line;
  const context = dialogueContext(advanced, 'therapist', null, 'Reply');
  expect(context.recent.at(-1)).toContain(action.line);
  expect(context.recent).not.toContain(currentScript);
  const recorded = reducer(advanced, { ...action, beat: advanced.beat });
  expect(recorded.history).not.toContain(currentScript);
});
it('accepts configured native extension requests without Origin and rejects spoofed website origins', async () => {
  const id = 'abcdefghijklmnopabcdefghijklmnop';
  const writer = {
    ready: vi.fn(async () => {}),
    generate: vi.fn(async () => ({
      line: 'This meeting has too many rectangles and no clear agenda.',
      emotion: 'neutral' as const,
      source: 'local-ai' as const,
      model: AI_MODEL,
    })),
  };
  const local = {
    voices: vi.fn(async () => []),
    speak: vi.fn(async () => Buffer.from('wav')),
    close: vi.fn(),
  };
  const server = createVoiceServer({
    origins: [`chrome-extension://${id}`],
    writer,
    kokoro: local,
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = {
    'X-TA-Client': '1',
    'X-TA-Extension-ID': id,
    'Content-Type': 'application/json',
  };
  try {
    expect((await fetch(base + '/kokoro/voices', { headers })).status).toBe(200);
    expect((await fetch(base + '/dialogue/status', { headers })).status).toBe(200);
    expect(
      (
        await fetch(base + '/dialogue', {
          headers,
          method: 'POST',
          body: JSON.stringify(context()),
        })
      ).status,
    ).toBe(200);
    expect(writer.generate).toHaveBeenCalledOnce();
    expect(
      (
        await fetch(base + '/dialogue', {
          headers,
          method: 'POST',
          body: JSON.stringify({ ...context(), speaker: 'fake' }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(base + '/kokoro/voices', {
          headers: { ...headers, Origin: 'https://hostile.test' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(base + '/kokoro/voices', {
          headers: { ...headers, 'X-TA-Extension-ID': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
        })
      ).status,
    ).toBe(403);
    expect((await fetch(base + '/kokoro/voices', { headers: { 'X-TA-Client': '1' } })).status).toBe(
      403,
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});

it('the backend loads under Node native TypeScript stripping', async () => {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      "await import('./apps/voice-server/server.ts');",
    ],
    { encoding: 'utf8', timeout: 10000 },
  );
  expect(result.stderr).not.toContain('ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX');
  expect(result.status).toBe(0);
});
