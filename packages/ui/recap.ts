import { createReel, drawReel, CARD_WIDTH, CARD_HEIGHT, REEL_DURATION } from './reel';
import { endingFor } from '../game-core/reducer';
import type { GameState } from '../game-core/types';
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
const cleanText = (value: string) =>
  value
    .replace(/https?:\/\/\S+/gi, '[link omitted]')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\u2014/g, ', ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export function sessionHighlights(state: GameState, count = 8): string[] {
  return [...new Set(state.history.map(cleanText).filter((line) => line.length > 20))].slice(
    -count,
  );
}
export function recapText(state: GameState): string {
  const ending = endingFor(state);
  const counts = ['keep', 'group', 'retire'].map(
    (fate) => state.characters.filter((c) => c.fate === fate).length,
  );
  const sections = (['keep', 'group', 'retire', 'undecided'] as const).flatMap((fate, i) => {
    const cast = state.characters.filter((c) => c.fate === fate);
    if (fate === 'undecided' && !cast.length) return [];
    return [
      `${['SPOTLIGHT', 'GROUP THERAPY', 'BALCONY', 'AWAITING A VERDICT'][i]} (${cast.length})\n${cast.map((c, j) => `${j + 1}. ${cleanText(c.title || c.name)}\n   ${cleanText(c.role)}`).join('\n') || 'No tabs in this section.'}`,
    ];
  });
  const moments = sessionHighlights(state, 12);
  return `TABS ANONYMOUS\nSESSION RECAP\n\n${ending.title}\n${ending.description}\n\nTHE VERDICT\n${state.characters.length} featured tabs: ${counts[0]} kept, ${counts[1]} grouped, ${counts[2]} retired.\n\n${sections.join('\n\n')}\n\nSESSION HIGHLIGHTS\n${moments.map((h, i) => `${i + 1}. ${h}`).join('\n\n') || 'No conversation was recorded in this session.'}\n\nABOUT THIS RECAP\nThese are fictional arena verdicts. No browser tabs were closed.\nNative grouping, if separately approved, is not recorded here.\nIncludes tab titles and session dialogue. Review before sharing.\nPage URLs are not added; links inside titles or dialogue are omitted.\n`;
}
// Preview and download share one encode, including while it is still pending.
// Weak keys release the image when the completed session is no longer retained.
const awardImages = new WeakMap<GameState, Promise<Blob>>();
export function awardPng(state: GameState): Promise<Blob> {
  const existing = awardImages.get(state);
  if (existing) return existing;
  const pending = renderAwardPng(state).catch((error: unknown) => {
    awardImages.delete(state);
    throw error;
  });
  awardImages.set(state, pending);
  return pending;
}
async function renderAwardPng(state: GameState): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  drawReel(canvas, createReel(state), REEL_DURATION, true);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))),
      'image/png',
    ),
  );
}
export async function downloadPng(state: GameState): Promise<void> {
  const blob = await awardPng(state);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tabs-anonymous-award.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
