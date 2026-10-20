import { it, expect, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createVoiceServer } from '../apps/voice-server/server';
import { autoCast, KOKORO_VOICES, deliveryFor, previewLine } from '../packages/ui/voices';
import { demoCharacters } from '../packages/game-core/fixtures';

it('reserves George, gives all twelve tabs different voices, and keeps identities when reordered', () => {
  const cast = autoCast(KOKORO_VOICES, demoCharacters);
  expect(cast.therapist).toBe('bm_george');
  expect(new Set(Object.values(cast)).size).toBe(13);
  expect(autoCast(KOKORO_VOICES, [...demoCharacters].reverse())).toEqual(cast);
  expect(deliveryFor(demoCharacters[0], 'angry').emotion).toBe('angry');
  expect(deliveryFor(demoCharacters[0], 'victory').emotion).toBe('victorious');
  expect(previewLine(demoCharacters[0], 'angry')).not.toBe(
    previewLine(demoCharacters[0], 'crying'),
  );
});
it('serves local voices and WAV reactions without a key or cloud request, validates voices, and caches by emotion', async () => {
  const upstream = vi.fn(() => {
    throw new Error('Cloud must not be called');
  });
  const local = {
    voices: vi.fn(async () => KOKORO_VOICES),
    speak: vi.fn(async (_input: unknown, _signal: AbortSignal) => Buffer.from('RIFFfixture')),
    close: vi.fn(),
  };
  const server = createVoiceServer({
    key: '',
    kokoro: local,
    fetcher: upstream,
    origins: ['http://127.0.0.1:4173'],
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = {
    Origin: 'http://127.0.0.1:4173',
    'X-TA-Client': '1',
    'Content-Type': 'application/json',
  };
  try {
    expect((await (await fetch(base + '/kokoro/voices', { headers })).json()).voices).toHaveLength(
      13,
    );
    for (const emotion of ['angry', 'angry', 'crying']) {
      const res = await fetch(base + '/kokoro/speech', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: '[laughing] I have feelings.',
          voiceId: 'am_puck',
          emotion,
          therapist: false,
        }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('audio/wav');
    }
    expect(local.speak).toHaveBeenCalledTimes(2);
    expect(local.speak.mock.calls[0][0]).toMatchObject({
      text: ' I have feelings.',
      voiceId: 'am_puck',
      emotion: 'angry',
    });
    const invalid = await fetch(base + '/kokoro/speech', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: 'hi', voiceId: 'unknown', emotion: 'neutral' }),
    });
    expect(invalid.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  expect(local.close).toHaveBeenCalled();
});
