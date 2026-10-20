import { it, expect, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createVoiceServer } from '../apps/voice-server/server';
import { autoCast, KOKORO_VOICES, deliveryFor } from '../packages/ui/voices';
import { demoCharacters } from '../packages/game-core/fixtures';

it('reserves George, gives all twelve tabs different voices, and keeps identities when reordered', () => {
  const cast = autoCast(KOKORO_VOICES, demoCharacters);
  expect(cast.therapist).toBe('bm_george');
  expect(new Set(Object.values(cast)).size).toBe(13);
  expect(autoCast(KOKORO_VOICES, [...demoCharacters].reverse())).toEqual(cast);
  expect(deliveryFor(demoCharacters[0], 'angry').emotion).toBe('angry');
  expect(deliveryFor(demoCharacters[0], 'victory').emotion).toBe('victorious');
});
it('serves local voices and WAV reactions without a key or cloud request, validates voices, and caches by emotion', async () => {
  const local = {
    voices: vi.fn(async () => KOKORO_VOICES),
    speak: vi.fn(async (_input: unknown, _signal: AbortSignal) => Buffer.from('RIFFfixture')),
    close: vi.fn(),
  };
  const server = createVoiceServer({
    kokoro: local,
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
    const preflight = await fetch(base + '/kokoro/speech', {
      method: 'OPTIONS',
      headers: {
        Origin: headers.Origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, x-ta-client',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(headers.Origin);
    expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('X-TA-Client');
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
    expect((await fetch(base + '/voices', { headers })).status).toBe(404);
    expect((await fetch(base + '/speech', { method: 'POST', headers, body: '{}' })).status).toBe(
      404,
    );
    expect(
      (
        await fetch(base + '/kokoro/voices', {
          headers: { ...headers, Origin: 'https://untrusted.test' },
        })
      ).status,
    ).toBe(403);
    expect(
      (await fetch(base + '/kokoro/voices', { headers: { Origin: headers.Origin } })).status,
    ).toBe(403);
    expect(await (await fetch(base + '/health', { headers })).json()).toEqual({
      engine: 'kokoro',
      offline: true,
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  expect(local.close).toHaveBeenCalled();
});
