import { spawnSync } from 'node:child_process';
const result = spawnSync('ollama', ['pull', 'qwen3:4b'], { stdio: 'inherit' });
if (result.error || result.status !== 0) {
  console.error(
    'Install Ollama, start it, then rerun npm run ai:setup. On macOS: brew install ollama; node scripts/local-services.mjs --writer-only',
  );
  process.exit(1);
}
console.log('The local dialogue model is installed. No cloud key is used.');
