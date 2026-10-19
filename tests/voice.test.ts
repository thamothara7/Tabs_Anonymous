import { describe, it, expect, vi } from 'vitest';
import { createVoiceServer } from '../apps/voice-server/server';
import { autoCast, deliveryFor } from '../packages/ui/voices';
import { demoCharacters } from '../packages/game-core/fixtures';
import { initialState, reducer } from '../packages/game-core/reducer';
import { decodeSession, encodeSession } from '../packages/game-core/session';
import type { AddressInfo } from 'node:net';

describe('distinct casting and delivery', () => {
  it('reserves the therapist and distributes 12 separate tab voices when available', () => {
    const voices = Array.from({ length: 13 }, (_, i) => ({
      id: `voice${i}`,
      name: i === 5 ? 'Deep authoritative narrator' : `Actor ${i}`,
    }));
    const map = autoCast(voices, demoCharacters);
    expect(map.therapist).toBe('voice5');
    expect(new Set(Object.values(map)).size).toBe(13);
    expect(deliveryFor(undefined, 'talk').rate).toBeLessThan(1);
    expect(deliveryFor(demoCharacters[0], 'retire').emotion).toBe('crying');
    expect(deliveryFor(demoCharacters[0], 'victory').emotion).toBe('victorious');
  });
  it('avoids repeated confession punchlines across 12 same-category tabs and reload', () => {
    const cast = Array.from({ length: 12 }, (_, i) => ({
      ...demoCharacters[0],
      id: `c${i}`,
      title: `Project ${i}`,
      name: `Project ${i}`,
      url: `https://github.com/test/${i}`,
    }));
    let s = reducer(initialState(cast), { type: 'START' });
    const lines: string[] = [];
    for (const c of cast) {
      s = reducer(s, { type: 'SPEAK', id: c.id });
      lines.push(s.actionLine!.split('”: ')[1]);
    }
    expect(new Set(lines).size).toBe(12);
    const restored = decodeSession(encodeSession(s), cast)!;
    expect(restored.history).toEqual(s.history);
    const next = reducer(restored, { type: 'SPEAK', id: cast[0].id });
    expect(lines).not.toContain(next.actionLine!.split('”: ')[1]);
  });
});

describe('voice server boundary', () => {
  async function run(
    key: string,
    exercise: (base: string, upstream: ReturnType<typeof vi.fn>) => Promise<void>,
  ) {
    const upstream = vi.fn(async (url: string) =>
      url.includes('/v2/voices')
        ? Response.json({ voices: [{ voice_id: 'actor1', name: 'Narrator' }] })
        : new Response(new Uint8Array([73, 68, 51, 1, 2]), {
            headers: { 'Content-Type': 'audio/mpeg' },
          }),
    );
    const server = createVoiceServer({
      key,
      origins: ['http://127.0.0.1:5173'],
      fetcher: upstream as unknown as typeof fetch,
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await exercise(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, upstream);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    }
  }
  const headers = {
    Origin: 'http://127.0.0.1:5173',
    'X-TA-Client': '1',
    'Content-Type': 'application/json',
  };
  it('rejects foreign origins and missing configuration without calling the provider', async () => {
    await run('', async (base, upstream) => {
      expect(
        (
          await fetch(base + '/voices', {
            headers: { ...headers, Origin: 'https://untrusted.test' },
          })
        ).status,
      ).toBe(403);
      expect((await fetch(base + '/voices', { headers })).status).toBe(503);
      expect(upstream).not.toHaveBeenCalled();
    });
  });
  it('uses server-only credentials, controlled emotional tags and cached audio', async () => {
    await run('test-server-secret', async (base, upstream) => {
      const voices = await (await fetch(base + '/voices', { headers })).json();
      expect(voices.voices[0].id).toBe('actor1');
      const body = JSON.stringify({
        text: '[shouting] Welcome to the room.',
        voiceId: 'actor1',
        emotion: 'neutral',
        therapist: true,
      });
      for (let i = 0; i < 2; i++) {
        const response = await fetch(base + '/speech', { method: 'POST', headers, body });
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
        expect((await response.arrayBuffer()).byteLength).toBe(5);
      }
      expect(upstream).toHaveBeenCalledTimes(2);
      const options = (upstream.mock.calls[1] as unknown as [string, RequestInit])[1];
      expect(options.headers).toEqual(
        expect.objectContaining({ 'xi-api-key': 'test-server-secret' }),
      );
      const payload = JSON.parse(options.body as string);
      expect(payload.text).toContain('[confident] [calm]');
      expect(payload.text).not.toContain('[shouting]');
      expect(payload.model_id).toBe('eleven_v3');
      expect(
        (
          await fetch(base + '/speech', {
            method: 'POST',
            headers,
            body: JSON.stringify({ text: 'hi', voiceId: '../../secret', emotion: 'neutral' }),
          })
        ).status,
      ).toBe(400);
    });
  });
});
