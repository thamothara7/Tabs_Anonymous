import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { KokoroWorker, type LocalSpeech } from './kokoro.ts';

const emotions = new Set([
  'neutral',
  'happy',
  'smug',
  'angry',
  'shocked',
  'crying',
  'suspicious',
  'victorious',
]);
export function createVoiceServer(options: { origins?: string[]; kokoro?: LocalSpeech } = {}) {
  const allowed = new Set(
    options.origins ?? [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:4173',
      ...(process.env.TA_EXTENSION_ID ? [`chrome-extension://${process.env.TA_EXTENSION_ID}`] : []),
    ],
  );
  const kokoro = options.kokoro ?? new KokoroWorker();
  const cache = new Map<string, Buffer>();
  let cacheBytes = 0;
  let active = 0;
  const server = createServer(async (req, res) => {
    const path = req.url;
    const origin = req.headers.origin ?? '';
    const json = (code: number, value: unknown) => {
      res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    if (!/^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host ?? '') || !allowed.has(origin)) {
      json(403, { error: 'Origin not allowed. Set TA_EXTENSION_ID in .env for this extension.' });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-TA-Client');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.headers['x-ta-client'] !== '1') {
      json(403, { error: 'Missing client header.' });
      return;
    }
    if (req.url === '/health' && req.method === 'GET') {
      json(200, { engine: 'kokoro', offline: true });
      return;
    }
    if (path !== '/kokoro/voices' && path !== '/kokoro/speech') {
      json(404, { error: 'Not found.' });
      return;
    }
    if (active >= 2) {
      json(429, { error: 'Voice server is busy. Try again shortly.' });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    active++;
    try {
      if (path === '/kokoro/voices' && req.method === 'GET') {
        json(200, {
          voices: await kokoro.voices(controller.signal),
          engine: 'kokoro',
          offline: true,
        });
        return;
      }
      if (path !== '/kokoro/speech' || req.method !== 'POST') {
        json(404, { error: 'Not found.' });
        return;
      }
      if (!req.headers['content-type']?.startsWith('application/json')) {
        json(415, { error: 'Expected JSON.' });
        return;
      }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 8192) {
          json(413, { error: 'Speech request is too large.' });
          return;
        }
      }
      let input: { text?: unknown; voiceId?: unknown; emotion?: unknown; therapist?: unknown };
      try {
        input = JSON.parse(body);
      } catch {
        json(400, { error: 'Invalid JSON.' });
        return;
      }
      if (
        typeof input.text !== 'string' ||
        !input.text.trim() ||
        input.text.length > 1000 ||
        typeof input.voiceId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(input.voiceId) ||
        typeof input.emotion !== 'string' ||
        !emotions.has(input.emotion)
      ) {
        json(400, { error: 'Invalid text, voice, or emotion.' });
        return;
      }
      // Titles are plain speech, never instructions to the synthesis engine.
      const text = input.text.replace(/\[[^\]]*\]/g, '').replace(/\u2014/g, '.');
      const payload = {
        text,
        voiceId: input.voiceId,
        emotion: input.emotion,
        therapist: input.therapist === true,
      };
      const cacheKey = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      let bytes = cache.get(cacheKey);
      if (!bytes) {
        const available = await kokoro.voices(controller.signal);
        if (!available.some((v) => v.id === input.voiceId)) {
          json(400, { error: 'Unknown Kokoro voice.' });
          return;
        }
        bytes = await kokoro.speak(payload, controller.signal);
        if (bytes.length > 8 * 1024 * 1024) throw new Error('Audio response too large');
        while (cacheBytes + bytes.length > 32 * 1024 * 1024 && cache.size) {
          const first = cache.keys().next().value!;
          cacheBytes -= cache.get(first)!.length;
          cache.delete(first);
        }
        cache.set(cacheKey, bytes);
        cacheBytes += bytes.length;
      }
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      });
      res.end(bytes);
    } catch (error) {
      if (!res.destroyed)
        json(502, {
          error:
            error instanceof Error
              ? error.message
              : 'Voice service unavailable or timed out. Retry the line.',
        });
    } finally {
      clearTimeout(timeout);
      active--;
    }
  });
  server.on('close', () => kokoro.close());
  return server;
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const server = createVoiceServer();
  server.listen(4317, '127.0.0.1', () =>
    console.log(
      'Tabs Anonymous voice server: http://127.0.0.1:4317. Kokoro only. Spoken text is never logged.',
    ),
  );
  const shutdown = () => {
    server.close();
    server.closeAllConnections();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
