import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { KokoroWorker, type LocalSpeech } from './kokoro.ts';

const delivery: Record<string, string> = {
  therapist: '[confident] [calm]',
  neutral: '[conversational]',
  happy: '[excited]',
  smug: '[sarcastic]',
  angry: '[frustrated]',
  shocked: '[surprised]',
  crying: '[sad]',
  suspicious: '[curious]',
  victorious: '[excited]',
};
export function createVoiceServer(
  options: {
    key?: string;
    origins?: string[];
    fetcher?: typeof fetch;
    model?: string;
    kokoro?: LocalSpeech;
  } = {},
) {
  const key = options.key ?? process.env.ELEVENLABS_API_KEY ?? '';
  const model = options.model ?? process.env.ELEVENLABS_MODEL ?? 'eleven_v3';
  const allowed = new Set(
    options.origins ?? [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:4173',
      ...(process.env.TA_EXTENSION_ID ? [`chrome-extension://${process.env.TA_EXTENSION_ID}`] : []),
    ],
  );
  const fetcher = options.fetcher ?? fetch;
  const kokoro = options.kokoro ?? new KokoroWorker();
  const cache = new Map<string, Buffer>();
  let cacheBytes = 0;
  let active = 0;
  const server = createServer(async (req, res) => {
    const local = req.url?.startsWith('/kokoro/') ?? false;
    const path = local ? req.url!.slice(7) : req.url;
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
      json(200, { configured: !!key, model });
      return;
    }
    if (!key && !local) {
      json(503, {
        error: 'Set ELEVENLABS_API_KEY in the local .env file and restart npm run voice:server.',
      });
      return;
    }
    if (active >= 2) {
      json(429, { error: 'Voice server is busy. Try again shortly.' });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), local ? 120000 : 45000);
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    active++;
    try {
      if (path === '/voices' && req.method === 'GET') {
        if (local) {
          json(200, {
            voices: await kokoro.voices(controller.signal),
            engine: 'kokoro',
            offline: true,
          });
          return;
        }
        const upstream = await fetcher('https://api.elevenlabs.io/v2/voices?page_size=100', {
          headers: { 'xi-api-key': key },
          signal: controller.signal,
        });
        if (!upstream.ok) {
          json(upstream.status === 401 ? 401 : 502, {
            error: 'ElevenLabs voice list failed. Check your API key and voice permissions.',
          });
          return;
        }
        const data = (await upstream.json()) as {
          voices: { voice_id: string; name: string; labels?: Record<string, string> }[];
        };
        json(200, {
          voices: data.voices.map((v) => ({
            id: v.voice_id,
            name: v.name,
            labels: v.labels ?? {},
          })),
        });
        return;
      }
      if (path !== '/speech' || req.method !== 'POST') {
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
        !Object.hasOwn(delivery, input.emotion)
      ) {
        json(400, { error: 'Invalid text, voice, or emotion.' });
        return;
      }
      // Only authored delivery tags enter the prompt; tab titles cannot inject voice directions.
      const plain = input.text.replace(/\[[^\]]*\]/g, '').replace(/\u2014/g, '.');
      const text = local
        ? plain
        : `${delivery[input.therapist === true ? 'therapist' : input.emotion]} ${plain}`;
      const payload = JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: input.therapist === true ? 1 : 0.5, similarity_boost: 0.75 },
      });
      const cacheKey = createHash('sha256')
        .update(
          (local ? `kokoro:${input.emotion}:${input.therapist === true}:` : 'cloud:') +
            input.voiceId +
            payload,
        )
        .digest('hex');
      let bytes = cache.get(cacheKey);
      if (!bytes) {
        if (local) {
          const available = await kokoro.voices(controller.signal);
          if (!available.some((v) => v.id === input.voiceId)) {
            json(400, { error: 'Unknown Kokoro voice. Reconnect to refresh the cast.' });
            return;
          }
          bytes = await kokoro.speak(
            {
              text: plain,
              voiceId: input.voiceId,
              emotion: input.emotion,
              therapist: input.therapist,
            },
            controller.signal,
          );
        } else {
          const upstream = await fetcher(
            `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_128`,
            {
              method: 'POST',
              headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
              body: payload,
              signal: controller.signal,
            },
          );
          if (!upstream.ok) {
            json(upstream.status === 401 ? 401 : 502, {
              error: `ElevenLabs speech failed (${upstream.status}). Check voice access, quota, and model access.`,
            });
            return;
          }
          bytes = Buffer.from(await upstream.arrayBuffer());
        }
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
        'Content-Type': local ? 'audio/wav' : 'audio/mpeg',
        'Cache-Control': 'no-store',
      });
      res.end(bytes);
    } catch (error) {
      if (!res.destroyed)
        json(502, {
          error:
            local && error instanceof Error
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
  createVoiceServer().listen(4317, '127.0.0.1', () =>
    console.log(
      'Tabs Anonymous voice server: http://127.0.0.1:4317. API key and spoken text are never logged.',
    ),
  );
}
