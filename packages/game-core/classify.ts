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
export function classify(raw: string): Category {
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
  if (matches(['youtube.com', 'youtu.be', 'twitch.tv', 'netflix.com'])) return 'video';
  if (matches(['docs.google.com', 'notion.so', 'wikipedia.org', 'coursera.org', 'figma.com']))
    return 'study';
  if (matches(['amazon.com', 'amazon.in', 'ebay.com', 'etsy.com'])) return 'shopping';
  if (matches(['reddit.com', 'instagram.com', 'x.com', 'twitter.com'])) return 'social';
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
  other: 'Misc. feelings',
};
