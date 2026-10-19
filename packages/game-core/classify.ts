import type { Category, TabFact } from './types';
export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    url.hash = '';
    // Keep the complete query: distinct searches are not duplicates.
    return url.href;
  } catch {
    return null;
  }
}
export function classify(raw: string, title = ''): Category {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return 'other';
  }
  const matches = (domains: string[]) => domains.some((d) => host === d || host.endsWith(`.${d}`));
  if (
    matches([
      'github.com',
      'leetcode.com',
      'stackoverflow.com',
      'gitlab.com',
      'developer.mozilla.org',
    ])
  )
    return 'code';
  if (
    matches([
      'devpost.com',
      'devfolio.co',
      'mlh.io',
      'hackerearth.com',
      'lu.ma',
      'luma.com',
      'eventbrite.com',
    ])
  )
    return 'events';
  if (
    matches([
      'figma.com',
      'canva.com',
      'dribbble.com',
      'behance.net',
      'pinterest.com',
      'pinterest.co.uk',
      'pinterest.in',
      'freepik.com',
      'unsplash.com',
      'polyhaven.com',
      'ambientcg.com',
    ])
  )
    return 'design';
  if (matches(['youtube.com', 'youtu.be', 'twitch.tv', 'netflix.com'])) return 'video';
  if (
    matches([
      'docs.google.com',
      'notion.so',
      'wikipedia.org',
      'coursera.org',
      'khanacademy.org',
      'udemy.com',
      'geeksforgeeks.org',
    ])
  )
    return 'study';
  if (matches(['amazon.com', 'amazon.in', 'ebay.com', 'etsy.com'])) return 'shopping';
  if (matches(['reddit.com', 'instagram.com', 'x.com', 'twitter.com'])) return 'social';
  // Titles are local hints, not claims about browsing history or page contents.
  if (/\b(hackathon|hackathons|devpost|devfolio)\b/i.test(title)) return 'events';
  if (/\b(texture|textures|design assets|color palette|colour palette|wireframe)\b/i.test(title))
    return 'design';
  if (/\b(study guide|lecture notes|course syllabus|dsa|data structures)\b/i.test(title))
    return 'study';
  return 'other';
}
export function duplicateGroups(tabs: Pick<TabFact, 'id' | 'url'>[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const tab of tabs) {
    const key = normalizeUrl(tab.url);
    if (key) groups.set(key, [...(groups.get(key) ?? []), tab.id]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}
export const categoryNames: Record<Category, string> = {
  code: 'Deep work',
  video: 'Just one more',
  study: 'Big plans',
  shopping: 'Retail therapy',
  social: 'The scroll hole',
  events: 'Big opportunities',
  design: 'Creative chaos',
  other: 'Misc. feelings',
};
