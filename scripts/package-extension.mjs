import { copyFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
copyFileSync('apps/chrome-extension/manifest.json', 'dist-extension/manifest.json');
cpSync('public/licenses', 'dist-extension/licenses', { recursive: true });
mkdirSync('artifacts', { recursive: true });
rmSync('artifacts/tabs-anonymous-extension.zip', { force: true });
// The unpacked directory is the cross-platform deliverable; zip is best effort.
try {
  execFileSync('zip', ['-qr', '../artifacts/tabs-anonymous-extension.zip', '.'], {
    cwd: 'dist-extension',
  });
  console.log('Extension: dist-extension/ and artifacts/tabs-anonymous-extension.zip');
} catch {
  console.log('Extension ready in dist-extension/. Zip it with your preferred archive tool.');
}
