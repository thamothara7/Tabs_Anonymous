/** Optional integration check. Requires voice:setup; uses only local Kokoro. */
import { mkdir, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { createVoiceServer } from '../apps/voice-server/server.ts';
const origin = 'http://127.0.0.1:4173';
const server = createVoiceServer({
  origins: [origin],
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const headers = { Origin: origin, 'X-TA-Client': '1', 'Content-Type': 'application/json' };
try {
  const response = await fetch(base + '/kokoro/voices', { headers });
  const catalog = await response.json();
  if (!response.ok || catalog.voices?.length !== 13)
    throw new Error(catalog.error ?? 'Missing voices');
  await mkdir('artifacts/kokoro', { recursive: true });
  const report = [];
  const samples = [
    {
      name: 'therapist',
      voiceId: 'bm_george',
      emotion: 'neutral',
      therapist: true,
      text: 'Welcome. Take a breath. I run this room, and every tab will get its turn.',
    },
    {
      name: 'angry',
      voiceId: 'am_fenrir',
      emotion: 'angry',
      text: 'Excuse me! I was promised a productive afternoon. This is a hostage situation!',
    },
    {
      name: 'sad',
      voiceId: 'af_heart',
      emotion: 'crying',
      text: 'Fine. I will wait on the balcony. I even saved your place in the article.',
    },
    {
      name: 'suspicious',
      voiceId: 'bm_lewis',
      emotion: 'suspicious',
      text: 'Interesting. You say you need me. Yet you cannot remember why you opened me.',
    },
    {
      name: 'neutral-comparison',
      voiceId: 'am_puck',
      emotion: 'neutral',
      text: 'I have a perfectly reasonable explanation. You just need to hear me out.',
    },
    {
      name: 'sad-comparison',
      voiceId: 'am_puck',
      emotion: 'crying',
      text: 'I have a perfectly reasonable explanation. You just need to hear me out.',
    },
  ];
  for (const sample of samples) {
    const start = performance.now();
    const res = await fetch(base + '/kokoro/speech', {
      method: 'POST',
      headers,
      body: JSON.stringify(sample),
      signal: AbortSignal.timeout(125000),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.length < 1000)
      throw new Error('Invalid WAV');
    await writeFile(`artifacts/kokoro/${sample.name}.wav`, bytes);
    const result = {
      sample: sample.name,
      voice: sample.voiceId,
      emotion: sample.emotion,
      bytes: bytes.length,
      generationMs: Math.round(performance.now() - start),
    };
    report.push(result);
    console.log(JSON.stringify(result));
  }
  await writeFile('artifacts/kokoro/report.json', JSON.stringify(report, null, 2));
  console.log(
    'Local Kokoro verification passed: 13 voices, 6 WAV samples, cloud requests disabled.',
  );
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
