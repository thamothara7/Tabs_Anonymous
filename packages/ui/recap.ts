import { endingFor } from '../game-core/reducer';
import type { GameState } from '../game-core/types';
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
/** Deliberately excludes tab names, URLs, IDs, and browsing categories from a shareable card. */
export function recapSvg(state: GameState): string {
  const ending = endingFor(state);
  const counts = ['keep', 'group', 'retire'].map(
    (fate) => state.characters.filter((c) => c.fate === fate).length,
  );
  const colors = ['#c3b4f2', '#f49a86', '#a6cfb4', '#f0ca7b', '#9bcbd7'];
  const cast = colors
    .map(
      (color, i) =>
        `<g transform="translate(${75 + i * 105},450) rotate(${i % 2 ? 8 : -7} 45 50)"><ellipse cx="45" cy="111" rx="40" ry="6" fill="#162c30"/><path d="M28 89v19h-8m42-19v19h8" stroke="#132e33" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M6 36V21q0-7 7-7h24l9 13h30q8 0 8 8v50q0 8-8 8H14q-8 0-8-8Z" fill="${color}" stroke="#172f35" stroke-width="3"/><ellipse cx="30" cy="56" rx="10" ry="12" fill="#fff7df"/><ellipse cx="62" cy="56" rx="10" ry="12" fill="#fff7df"/><circle cx="32" cy="57" r="4" fill="#223b40"/><circle cx="64" cy="57" r="4" fill="#223b40"/><path d="M34 76q12 15 23 0" stroke="#223b40" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><title>Tabs Anonymous — ${escapeXml(ending.title)}</title><desc>A fictional game award. ${counts[0]} kept, ${counts[1]} grouped, ${counts[2]} retired from the arena. No real tabs closed. No browsing details included.</desc><rect width="1200" height="630" rx="28" fill="#263d43"/><rect x="22" y="22" width="1156" height="586" rx="16" fill="none" stroke="#587269"/><text x="72" y="88" fill="#d2dfc4" font-family="sans-serif" font-size="17" font-weight="700" letter-spacing="4">TABS ANONYMOUS</text><text x="1128" y="88" text-anchor="end" fill="#9fb7a2" font-family="monospace" font-size="12">THE UNOFFICIAL TAB AWARDS</text><path d="m1025 165 14 34 37 3-28 24 8 36-31-19-32 19 9-36-28-24 37-3Z" fill="#e9c783"/><text x="72" y="178" fill="#e8aa85" font-family="monospace" font-size="13" letter-spacing="3">MY SESSION VERDICT</text><text x="70" y="259" fill="#f5f0dc" font-family="sans-serif" font-size="48" font-weight="700" letter-spacing="-1">${escapeXml(ending.title)}</text><text x="72" y="304" fill="#a8bdb0" font-family="sans-serif" font-size="20">A little less RAM. A lot more drama.</text><path d="M72 347h1056" stroke="#587269"/>${counts.map((n, i) => `<text x="${740 + i * 137}" y="460" text-anchor="middle" fill="#f1e8cb" font-family="sans-serif" font-size="49">${n}</text><text x="${740 + i * 137}" y="491" text-anchor="middle" fill="#aac0a9" font-family="monospace" font-size="12">${['KEPT', 'GROUPED', 'RETIRED'][i]}</text>`).join('')}${cast}<text x="1128" y="569" text-anchor="end" fill="#9bb399" font-family="monospace" font-size="12">FICTIONAL FEELINGS. ZERO TABS CLOSED.</text></svg>`;
}
export function downloadFile(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Allow the browser to consume the object URL before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
