import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { OllamaWriter, validDialogue, AI_MODEL, type LocalWriter } from './dialogue.ts';
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
export function createVoiceServer(
  options: { origins?: string[]; kokoro?: LocalSpeech; writer?: LocalWriter } = {},
) {
  const allowed = new Set(
    options.origins ?? [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:4173',
      ...(process.env.TA_EXTENSION_ID ? [`chrome-extension://${process.env.TA_EXTENSION_ID}`] : []),
    ],
  );
  const kokoro = options.kokoro ?? new KokoroWorker();
  const writer = options.writer ?? new OllamaWriter();
  let writing = false;
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
    // Privileged extension fetches omit Origin. Require its exact configured ID instead.
    // A web request with an Origin must still pass the origin allowlist, regardless of this header.
    const extensionId = req.headers['x-ta-extension-id'];
    const trustedExtension =
      !origin &&
      typeof extensionId === 'string' &&
      /^[a-p]{32}$/.test(extensionId) &&
      allowed.has(`chrome-extension://${extensionId}`);
    if (
      !/^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host ?? '') ||
      (!allowed.has(origin) && !trustedExtension)
    ) {
      json(403, { error: 'Origin not allowed. Set TA_EXTENSION_ID in .env for this extension.' });
      return;
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-TA-Client, X-TA-Extension-ID');
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
    if (
      !['/kokoro/voices', '/kokoro/speech', '/dialogue', '/dialogue/status'].includes(path ?? '')
    ) {
      json(404, { error: 'Not found.' });
      return;
    }
    const dialogue = path?.startsWith('/dialogue') ?? false;
    if (dialogue ? writing : active >= 2) {
      json(429, { error: 'Voice server is busy. Try again shortly.' });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), dialogue ? 45000 : 120000);
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    if (dialogue) writing = true;
    else active++;
    try {
      if (path === '/dialogue/status' && req.method === 'GET') {
        await writer.ready(controller.signal);
        json(200, { ready: true, model: AI_MODEL, offline: true });
        return;
      }
      if (path === '/kokoro/voices' && req.method === 'GET') {
        json(200, {
          voices: await kokoro.voices(controller.signal),
          engine: 'kokoro',
          offline: true,
        });
        return;
      }
      if (!['/kokoro/speech', '/dialogue'].includes(path ?? '') || req.method !== 'POST') {
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
        if (Buffer.byteLength(body) > (dialogue ? 16384 : 8192)) {
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
      if (dialogue) {
        if (!validDialogue(input)) {
          json(400, { error: 'Invalid dialogue context.' });
          return;
        }
        const result = await writer.generate(input, controller.signal);
        json(200, result);
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
      if (dialogue) writing = false;
      else active--;
    }
  });
  server.on('close', () => kokoro.close());
  return server;
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const server = createVoiceServer();
  server.listen(4317, '127.0.0.1', () =>
    console.log(
      'Tabs Anonymous voice server: http://127.0.0.1:4317. Local Kokoro and AI dialogue. Spoken text is never logged.',
    ),
  );
  const shutdown = () => {
    server.close();
    server.closeAllConnections();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
