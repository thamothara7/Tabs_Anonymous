import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const [command, args] of [
  ...(existsSync(fileURLToPath(new URL('../.venv-kokoro/bin/python', import.meta.url)))
    ? []
    : [['uv', ['venv', '--python', '3.12', '.venv-kokoro']]]),
  [
    'uv',
    [
      'pip',
      'install',
      '--python',
      '.venv-kokoro/bin/python',
      '-r',
      'apps/voice-server/kokoro/requirements.lock',
    ],
  ],
  ['.venv-kokoro/bin/python', ['apps/voice-server/kokoro/worker.py', '--download']],
]) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('Kokoro setup failed. Install uv and rerun npm run voice:setup.');
    process.exit(1);
  }
}
console.log('Kokoro is installed. Runtime speech stays offline. Start npm run voice:server.');
