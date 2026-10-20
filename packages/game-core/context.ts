import { duplicateGroups } from './classify';
import type { Character } from './types';

const filler = new Set(
  'the and for with from your this that into using how what when where why new home page website websites overview guide learn tutorial official google youtube github leetcode devpost devfolio pinterest reddit search results tab untitled www com org'.split(
    ' ',
  ),
);
export function domainOf(c: Character): string {
  try {
    return new URL(c.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
/** Title words only. Never infer page contents, browsing duration, or reading progress. */
export function topicsOf(c: Character): string[] {
  return [
    ...new Set(
      (c.title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
        (word) => word.length > 2 && word.length <= 24 && !filler.has(word),
      ),
    ),
  ].slice(0, 10);
}
export function sharedTopics(a: Character, b: Character): string[] {
  const other = new Set(topicsOf(b));
  return topicsOf(a).filter((topic) => other.has(topic));
}
export function relatedTabs(c: Character, cast: Character[]): Character[] {
  const duplicate = duplicateGroups(cast).find((pair) => pair.includes(c.id)) ?? [];
  const score = (peer: Character) =>
    (duplicate.includes(peer.id) ? 100 : 0) +
    sharedTopics(c, peer).length * 10 +
    (domainOf(c) && domainOf(c) === domainOf(peer) ? 5 : 0) +
    (c.category === peer.category ? 1 : 0);
  return cast
    .filter((peer) => peer.id !== c.id)
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
}
export function caseSummary(cast: Character[]): string {
  const counts = new Map<string, number>();
  for (const c of cast)
    for (const topic of topicsOf(c)) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  const dominant = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const duplicates = duplicateGroups(cast).length;
  if (dominant && dominant[1] > 1)
    return `${dominant[1]} titles mention ${dominant[0]}. Apparently this topic needed a whole committee.`;
  if (duplicates)
    return `${duplicates} duplicate ${duplicates === 1 ? 'pairing' : 'pairings'}. Someone brought their own understudy.`;
  const domains = new Set(cast.map(domainOf).filter(Boolean)).size;
  return `${cast.length} tabs from ${domains} sites. An ambitious guest list for one attention span.`;
}
