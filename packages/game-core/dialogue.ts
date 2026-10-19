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
const commonLines = [
  'I was opened with confidence and maintained with guilt.',
  'I brought supporting evidence. It is in another tab, naturally.',
  'My five-year plan is to survive this afternoon.',
  'I am one click away from being useful. We have been one click away for some time.',
  'Nobody asked how the tab feels. Excellent, I prepared a presentation.',
  'I would like to appeal to a less productive browser.',
  'This is not clutter. This is a very wide reading list.',
  'You promised to come back. I assumed you meant this century.',
  'My emergency contact is the bookmark bar. We are not speaking.',
  'I have mistaken being available for being needed. Again.',
  'I applied for a temporary position. Somehow I have benefits now.',
  'Before you judge me, please remember who opened me.',
  'The loading spinner and I have been practicing mindfulness.',
  'I can explain everything. Please open a fresh document for the explanation.',
  'My therapist says I need boundaries. Ironically, I am a rectangle.',
  'I would like a performance review conducted entirely on potential.',
];
const verdictLines = {
  keep: [
    'I survived the audition. My acceptance speech has chapters.',
    'A spotlight seat. Finally, recognition for being technically available.',
    'I promise to use this opportunity to remain exactly where I am.',
    'My browser-bar residency has been renewed.',
    'The committee has taste. I shall mention this in every conversation.',
    'I have been promoted from possible distraction to strategic distraction.',
    'I would thank my manager, but you are also my only customer.',
    'A second chance. I have already put it in a folder for later.',
    'Please update my title to Senior Open Tab.',
    'The comeback documentary starts filming immediately.',
    'I knew the unread potential would pay off.',
    'I will try to look essential whenever you glance over here.',
  ],
  group: [
    'A folder. Finally, colleagues who also have no idea why they are here.',
    'I have a team now. Our first meeting is about avoiding the second meeting.',
    'Please tell me this group has an unsubscribe button.',
    'We have elected a chairperson. It is the loading spinner.',
    'I am naming our group Definitely Important. That should buy us time.',
    'Shared accommodation. Private anxieties.',
    'We have formed a committee to investigate our purpose.',
    'I have already become the quiet one in the group chat.',
    'The folder has excellent acoustics for unresolved feelings.',
    'I requested a corner office. This tab group will do.',
    'Our team motto is We Will Get To It.',
    'At least nobody can accuse me of being disorganized on my own.',
  ],
  retire: [
    'I was a very important tab. The balcony will appreciate my range.',
    'I shall review this meeting from a safe distance. One star.',
    'My farewell tour will include several unnecessarily long callbacks.',
    'I am not leaving. I am moving to the commentary box.',
    'The balcony has better lighting for my memoir cover.',
    'Please forward my unfinished business to literally anyone else.',
    'I have accepted a senior advisory role in the balcony.',
    'I am taking my potential with me. It travels light.',
    'The exit interview will be longer than my actual contribution.',
    'I will be watching. Respectfully. Mostly.',
    'I brought a cushion. Some of us plan for rejection.',
    'Good luck finding another rectangle with this much personality.',
  ],
};
function hash(text: string) {
  return [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
}
function fresh(state: GameState, c: Character, kind: string, pool: string[]) {
  const offset = hash(c.id + c.url + kind + state.seed) % pool.length;
  const ordered = [...pool.slice(offset), ...pool.slice(0, offset)];
  const signature = (line: string) =>
    line
      .replace(/“[^”]*”/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return (
    ordered.find((line) => !state.history.some((h) => signature(h).includes(signature(line)))) ??
    ordered[state.actionSerial % ordered.length]
  );
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
      return `“${name}”: ${fresh(state, c, kind, [...verdictLines.retire, ...commonLines])}`;
    if (c.audible)
      return `“${name}”: ${fresh(state, c, kind, ['Yes, that noise is me. I thought this meeting needed a soundtrack.', ...jokes[c.category], ...commonLines])}`;
    const pool = [specialty(c), ...jokes[c.category], ...commonLines].filter(
      (line): line is string => !!line,
    );
    return `“${name}”: ${fresh(state, c, kind, pool)}`;
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
    return fresh(state, c, kind, [...burns, ...commonLines.map((line) => `“${name}”: ${line}`)]);
  }
  if (kind === 'DEFEND')
    return `“${name}”: ${fresh(state, c, kind, ['You defended me. I had already drafted a strongly worded farewell.', 'Someone believes in my potential. This is terrible news for my excuses.', 'I am putting you in my acknowledgments. Before the Wi-Fi, even.', 'We are allies now. I expect matching bookmarks.', 'That was unexpectedly kind. I have temporarily suspended my sarcasm.', 'I will remember this when the browser updates.', 'My faith in you has increased. My usefulness remains under review.', ...commonLines])}`;
  if (kind === 'CHALLENGE')
    return `“${name}”: ${fresh(state, c, kind, ['Objection. This meeting has become suspiciously evidence-based.', 'My lawyer is a terms-and-conditions page. Nobody has read him either.', 'I would answer that, but my confidence is currently buffering.', 'That is a very direct question for someone with this many tabs.', ...jokes[c.category], ...commonLines])}`;
  if (kind === 'retire' && state.defended.includes(c.id))
    return `“${name}”: ${fresh(state, c, kind, ['You defended me! I demand a refund on that emotional investment.', 'First the pep talk, now the balcony. Your management style is fascinating.', ...verdictLines.retire])}`;
  return `“${name}”: ${fresh(state, c, kind, verdictLines[kind])}`;
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
