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
  const colors = ['#c3b4f2', '#f49a86', '#a6cfb4', '#f0ca7b', '#9bcbd7'].slice(
    0,
    Math.min(5, Math.max(1, state.characters.length)),
  );
  const cast = colors
    .map(
      (color, i) =>
        `<g transform="translate(${75 + i * 105},450) rotate(${i % 2 ? 8 : -7} 45 50)"><ellipse cx="45" cy="111" rx="40" ry="6" fill="#162c30"/><path d="M28 89v19h-8m42-19v19h8" stroke="#132e33" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M6 36V21q0-7 7-7h24l9 13h30q8 0 8 8v50q0 8-8 8H14q-8 0-8-8Z" fill="${color}" stroke="#172f35" stroke-width="3"/><ellipse cx="30" cy="56" rx="10" ry="12" fill="#fff7df"/><ellipse cx="62" cy="56" rx="10" ry="12" fill="#fff7df"/><circle cx="32" cy="57" r="4" fill="#223b40"/><circle cx="64" cy="57" r="4" fill="#223b40"/><path d="M34 76q12 15 23 0" stroke="#223b40" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
    )
    .join('');
  const words = ending.title.split(' ');
  const titleLines: string[] = [''];
  for (const word of words) {
    const last = titleLines.length - 1;
    if ((titleLines[last] + ' ' + word).trim().length > 25) titleLines.push(word);
    else titleLines[last] = (titleLines[last] + ' ' + word).trim();
  }
  const subtitle =
    counts[2] === state.characters.length
      ? 'The balcony is sold out. The room has trust issues.'
      : counts[0] === 0
        ? 'No stars. An ensemble cast with very strong opinions.'
        : `${counts[0]} stars survived the casting call. Everyone else wants a recount.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><title>Tabs Anonymous : ${escapeXml(ending.title)}</title><desc>A fictional game award. ${counts[0]} kept, ${counts[1]} grouped, ${counts[2]} retired from the arena. No real tabs closed. No browsing details included.</desc><rect width="1200" height="630" rx="28" fill="#263d43"/><rect x="22" y="22" width="1156" height="586" rx="16" fill="none" stroke="#587269"/><text x="72" y="88" fill="#d2dfc4" font-family="sans-serif" font-size="17" font-weight="700" letter-spacing="4">TABS ANONYMOUS</text><text x="1128" y="88" text-anchor="end" fill="#9fb7a2" font-family="monospace" font-size="12">THE UNOFFICIAL TAB AWARDS</text><path d="m1025 165 14 34 37 3-28 24 8 36-31-19-32 19 9-36-28-24 37-3Z" fill="#e9c783"/><text x="72" y="158" fill="#e8aa85" font-family="monospace" font-size="13" letter-spacing="3">MY SESSION VERDICT</text><text x="70" y="220" fill="#f5f0dc" font-family="sans-serif" font-size="48" font-weight="700" letter-spacing="-1">${titleLines.map((line, i) => `<tspan x="72" dy="${i ? 55 : 0}">${escapeXml(line)}</tspan>`).join('')}</text><text x="72" y="319" fill="#a8bdb0" font-family="sans-serif" font-size="20">${escapeXml(subtitle)}</text><path d="M72 347h1056" stroke="#587269"/>${counts.map((n, i) => `<text x="${740 + i * 137}" y="460" text-anchor="middle" fill="#f1e8cb" font-family="sans-serif" font-size="49">${n}</text><text x="${740 + i * 137}" y="491" text-anchor="middle" fill="#aac0a9" font-family="monospace" font-size="12">${['KEPT', 'GROUPED', 'RETIRED'][i]}</text>`).join('')}${cast}<text x="1128" y="569" text-anchor="end" fill="#9bb399" font-family="monospace" font-size="12">FICTIONAL FEELINGS. ZERO TABS CLOSED.</text></svg>`;
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

/** Detailed export is deliberately separate from the privacy-safe image. */
export function recapText(state: GameState): string {
  const ending = endingFor(state);
  const sections = (['keep', 'group', 'retire'] as const).map((fate, i) => {
    const cast = state.characters.filter((c) => c.fate === fate);
    return `${['SPOTLIGHT', 'GROUP THERAPY', 'BALCONY'][i]} (${cast.length})\n${cast.map((c) => `- ${c.name}`).join('\n') || '- Nobody'} `;
  });
  const moments = state.history.filter((h) => h.includes('“')).slice(-8);
  return `TABS ANONYMOUS : SESSION RECAP\n${ending.title}\n${ending.description}\n\n${sections.join('\n\n')}\n\nSESSION HIGHLIGHTS\n${moments.map((h) => `• ${h}`).join('\n') || 'A remarkably quiet meeting. Suspicious.'}\n\nThese are fictional arena verdicts. No browser tabs were closed.\nNative grouping, if separately approved, is not recorded by this recap.\nIncludes tab titles; review before sharing. Page URLs are not added.\nSession seed: ${state.seed}\n`;
}
export async function downloadPng(svg: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(img, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('PNG export failed'))),
        'image/png',
      ),
    );
    const pngUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = 'tabs-anonymous-award.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
