import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
if (process.platform !== 'darwin')
  throw new Error(
    'Login services currently support macOS. Run ollama serve and npm run voice:server on Linux.',
  );
const uid = process.getuid();
const stableNode =
  ['/opt/homebrew/opt/node/bin/node', '/usr/local/opt/node/bin/node'].find(existsSync) ??
  process.execPath;
const directory = join(homedir(), 'Library', 'LaunchAgents');
const logs = join(root, 'artifacts', 'services');
const escape = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const ollama = spawnSync('which', ['ollama'], { encoding: 'utf8' }).stdout.trim();
const stop = process.argv.includes('--stop');
const writerOnly = process.argv.includes('--writer-only');
const voiceOnly = process.argv.includes('--voice-only');
if (voiceOnly && writerOnly) throw new Error('Choose --voice-only or --writer-only, not both.');
if (!stop && !voiceOnly && !ollama) throw new Error('Install Ollama first: brew install ollama');
// Validate prerequisites before stopping any running service.
if (!stop && !writerOnly && !existsSync(join(root, '.venv-kokoro/bin/python')))
  throw new Error('Run npm run voice:setup first.');
await mkdir(directory, { recursive: true });
await mkdir(logs, { recursive: true });
const services = [
  {
    label: 'com.tabsanonymous.writer',
    args: [ollama, 'serve'],
    env: {
      OLLAMA_HOST: '127.0.0.1:11434',
      OLLAMA_NO_CLOUD: '1',
      OLLAMA_NUM_PARALLEL: '1',
      OLLAMA_MAX_LOADED_MODELS: '1',
      OLLAMA_KEEP_ALIVE: '5m',
    },
  },
  ...(!writerOnly
    ? [
        {
          label: 'com.tabsanonymous.voice',
          args: [
            stableNode,
            '--env-file-if-exists=.env',
            '--experimental-strip-types',
            'apps/voice-server/server.ts',
          ],
          env: {},
        },
      ]
    : []),
];
for (const service of services.filter((s) => !voiceOnly || s.label.endsWith('voice'))) {
  const file = join(directory, `${service.label}.plist`);
  spawnSync('launchctl', ['bootout', `gui/${uid}/${service.label}`], { stdio: 'ignore' });
  if (stop) {
    await rm(file, { force: true });
    continue;
  }
  const plist = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
<key>Label</key><string>${service.label}</string>
<key>ProgramArguments</key><array>${service.args.map((a) => `<string>${escape(a)}</string>`).join('')}</array>
<key>WorkingDirectory</key><string>${escape(root)}</string>
<key>EnvironmentVariables</key><dict>${Object.entries(service.env)
    .map(([k, v]) => `<key>${k}</key><string>${escape(v)}</string>`)
    .join('')}</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>StandardOutPath</key><string>${escape(join(logs, service.label + '.log'))}</string>
<key>StandardErrorPath</key><string>${escape(join(logs, service.label + '.error.log'))}</string>
</dict></plist>`;
  await writeFile(file, plist, { mode: 0o600 });
  let result;
  for (let attempt = 0; attempt < 12; attempt++) {
    result = spawnSync('launchctl', ['bootstrap', `gui/${uid}`, file], { encoding: 'utf8' });
    if (result.status === 0) break;
    // Bootout returns before the old service has fully exited.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (result.status !== 0) throw new Error(`Could not start ${service.label}: ${result.stderr}`);
}
if (!stop) {
  for (const url of [
    ...(!voiceOnly ? ['http://127.0.0.1:11434/api/version'] : []),
    ...(!writerOnly ? ['http://127.0.0.1:4317/health'] : []),
  ]) {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const response = await fetch(url, {
          headers: { Origin: 'http://127.0.0.1:5173', 'X-TA-Client': '1' },
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Launchd may still be starting the process. */
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready)
      throw new Error(`Service did not become ready: ${url}. See artifacts/services logs.`);
  }
}
console.log(
  stop
    ? 'Tabs Anonymous login services removed.'
    : 'Local services registered. They start at login and restart after an exit.',
);
