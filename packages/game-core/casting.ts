import { duplicateGroups, categoryNames } from './classify';
import type { TabFact } from './types';
/** Preserve one valid duplicate pair, then choose across categories before filling seats. */
export function featuredTabs(tabs: TabFact[], limit = 12): TabFact[] {
  const cap = Math.max(0, Math.min(12, Math.floor(limit)));
  const chosen: TabFact[] = [];
  const add = (tab: TabFact | undefined) => {
    if (tab && chosen.length < cap && !chosen.some((c) => c.id === tab.id)) chosen.push(tab);
  };
  for (const id of duplicateGroups(tabs)[0]?.slice(0, 2) ?? []) add(tabs.find((t) => t.id === id));
  for (const category of Object.keys(categoryNames)) add(tabs.find((t) => t.category === category));
  for (const tab of tabs) add(tab);
  return chosen;
}
