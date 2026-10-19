import { duplicateGroups } from './classify';
import type { Category, Character, Fate, GameState } from './types';

export function shortTitle(c: Pick<Character, 'title'>, limit = 42): string {
  const text = c.title.replace(/\s+/g, ' ').trim() || 'Untitled tab';
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}
function host(c: Character) {
  try {
    return new URL(c.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
const jokes: Record<Category, string[]> = {
  code: [
    'I have 99 problems. Opening another problem is apparently the solution.',
    'My code review says “looks good.” My emotional review says “needs work.”',
    'I’m a side project. At this point, the side is the entire personality.',
  ],
  video: [
    'The next video is educational. So were the previous seventeen alibis.',
    'My progress bar is doing more progressing than this project.',
    'I came with subtitles because your attention has left the room.',
  ],
  study: [
    'I’m a study plan with no eyewitnesses.',
    'Reading my title counts as revision, right?',
    'You opened me to learn something. So far we’ve learned how to open tabs.',
  ],
  shopping: [
    'The cart is full. The justification is still loading.',
    'Free shipping is not a financial strategy, but I admire the commitment.',
    'I’m not impulse buying. I’m researching who you could be with a lamp.',
  ],
  social: [
    'I came for one notification. I brought a constitutional crisis.',
    'This meeting could have been a post nobody finished reading.',
    'Your attention span and I are in a very exclusive relationship.',
  ],
  events: [
    'I’m collecting potential future versions of myself. None has submitted yet.',
    'Another hackathon? Excellent. The unfinished projects needed a reunion.',
    'My pitch deck has a roadmap. Your calendar has a restraining order.',
  ],
  design: [
    'I made three mood boards for this crisis. None includes closure.',
    'The project is unfinished, but the inspiration folder is award-winning.',
    'One more reference and we can finally begin choosing a reference.',
  ],
  other: [
    'You forgot why I’m here. I’m choosing to call that job security.',
    'I am not abandoned. I’m strategically archived in plain sight.',
    'My purpose is mysterious. My rent in your tab bar is overdue.',
  ],
};
export function confessionFor(category: Category, variant = 0): string {
  return jokes[category][Math.abs(variant) % jokes[category].length];
}
function specialty(c: Character): string | null {
  const domain = host(c);
  const at = (site: string) => domain === site || domain.endsWith(`.${site}`);
  if (at('leetcode.com'))
    return 'You opened a coding problem. I opened an investigation into why we’re still here.';
  if (at('github.com'))
    return 'You opened a repository for inspiration. I’d like to inspire you to make a commit.';
  if (at('devpost.com') || at('devfolio.co'))
    return 'You’ve entered the browsing stage of the hackathon. Bold strategy. Very competitive field.';
  if (at('pinterest.com'))
    return 'I’m a vision board for a person who apparently has forty-seven hobbies.';
  if (at('youtube.com'))
    return 'The algorithm says you need one more video. The algorithm is my lawyer.';
  if (at('chatgpt.com') || at('claude.ai'))
    return 'You asked me to explain it simply. Then opened three more tabs to explain my explanation.';
  if (/\b(java|dsa|study guide)\b/i.test(c.title))
    return 'The study guide is ready. The student is buffering.';
  if (/sum|array|algorithm/i.test(c.title))
    return 'I can find the sum of an array. Can anyone find the sum of your attention span?';
  if (/texture|font|palette/i.test(c.title))
    return 'We have enough textures to upholster the entire internet. Shall we build something now?';
  return null;
}
export function personalLine(c: Character, variant = 0): string {
  const intro = `“${shortTitle(c)}” here.`;
  const special = specialty(c);
  return `${intro} ${special && variant % 3 === 0 ? special : confessionFor(c.category, variant)}`;
}
export function reactionFor(
  state: GameState,
  c: Character,
  kind: 'SPEAK' | 'DEFEND' | 'CHALLENGE' | 'ROAST' | Exclude<Fate, 'undecided'>,
): string {
  const name = shortTitle(c);
  const v = state.actionSerial;
  if (kind === 'SPEAK') {
    if (c.fate === 'retire')
      return `“${name}” reporting from the balcony. Great view of everyone making the same mistakes.`;
    if (c.audible)
      return `“${name}” here. Yes, that noise is me. I thought this meeting needed a soundtrack.`;
    return personalLine(c, v);
  }
  if (kind === 'ROAST') {
    const pair = duplicateGroups(state.characters).find((g) => g.includes(c.id));
    const same = state.characters.filter((t) => t.category === c.category).length;
    const other = state.characters.find((t) => t.id !== c.id && t.fate === 'keep');
    const burns = [
      `“${name}” has requested main-character status. The committee has requested evidence.`,
      pair
        ? `“${name}” has a duplicate. Even your procrastination hired an understudy.`
        : `${same} ${c.category === 'other' ? 'mystery' : c.category} tabs in this room, and “${name}” still calls itself a unique opportunity.`,
      other
        ? `“${shortTitle(other)}” got a spotlight seat. “${name}” would like to speak to the casting director.`
        : `“${name}”: opened with ambition, maintained by guilt. A beautiful business model.`,
      `“${name}” says it sparks joy. The fan on your laptop has filed a dissenting opinion.`,
    ];
    return burns[v % burns.length];
  }
  if (kind === 'DEFEND')
    return `You defended “${name}”? ${c.loyalty > 70 ? 'At this point we should get matching bookmarks.' : 'I’m putting you in my acknowledgments. Right after the Wi-Fi.'}`;
  if (kind === 'CHALLENGE')
    return `“${name}” objects! ${c.confidence < 40 ? 'I have already lowered my expectations. Please respect the basement.' : confessionFor(c.category, v + 1)}`;
  if (kind === 'keep')
    return `“${name}” survives! ${c.fate === 'retire' ? 'A balcony-to-spotlight comeback. Someone call the documentary crew.' : 'I’ve prepared a forty-minute acceptance speech. Your battery has declined.'}`;
  if (kind === 'group')
    return `“${name}” is joining ${state.characters.filter((t) => t.category === c.category && t.fate === 'group' && t.id !== c.id).length ? 'the others in group therapy. We already disagree about the folder name.' : 'a folder. Finally, a place to organize my unprocessed potential.'}`;
  return `“${name}”: I WAS A VERY IMPORTANT TAB! ${state.defended.includes(c.id) ? 'You defended me! I demand a refund on that emotional investment.' : v % 2 ? 'I’ll be in the balcony, writing my memoir.' : 'Is there Wi-Fi in the balcony?'}`;
}
export function votingLine(state: GameState): string {
  const left = state.characters.filter((c) => c.fate === 'undecided').length;
  const retired = state.characters.filter((c) => c.fate === 'retire').length;
  if (!left)
    return 'Every tab has a verdict. The awards are ready. Their acceptance speeches are unfortunately unabridged.';
  if (retired)
    return `${left} verdict${left === 1 ? '' : 's'} to go. The balcony has ${retired} critic${retired === 1 ? '' : 's'} and absolutely no constructive feedback.`;
  return `${left} tabs still need a verdict. Keep your stars, form a group, or send someone to the balcony. The roast microphone is open.`;
}
