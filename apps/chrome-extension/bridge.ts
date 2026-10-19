import { classify, normalizeUrl, categoryNames } from '../../packages/game-core/classify';
import type { Category, TabFact } from '../../packages/game-core/types';
export interface BrowserTab {
  id?: number;
  windowId: number;
  title?: string;
  url?: string;
  pendingUrl?: string;
  pinned: boolean;
  incognito: boolean;
  audible?: boolean;
  groupId?: number;
}
export interface TabPort {
  query: (windowId: number) => Promise<BrowserTab[]>;
  group: (ids: number[]) => Promise<number>;
  updateGroup: (
    id: number,
    title: string,
    color: chrome.tabGroups.TabGroup['color'],
  ) => Promise<unknown>;
}
export interface ProposedGroup {
  category: Category;
  title: string;
  color: chrome.tabGroups.TabGroup['color'];
  tabs: TabFact[];
}
export interface GroupResult {
  applied: string[];
  skipped: string[];
  errors: string[];
}
const colors: Record<Category, chrome.tabGroups.TabGroup['color']> = {
  code: 'purple',
  video: 'red',
  study: 'green',
  shopping: 'yellow',
  social: 'pink',
  events: 'orange',
  design: 'blue',
  other: 'cyan',
};
export function eligible(tab: BrowserTab, windowId: number): boolean {
  return (
    typeof tab.id === 'number' &&
    tab.windowId === windowId &&
    !tab.incognito &&
    !tab.pinned &&
    !!normalizeUrl(tab.url ?? '') &&
    (!tab.pendingUrl || tab.pendingUrl === tab.url)
  );
}
export function snapshot(tabs: BrowserTab[], windowId: number): TabFact[] {
  return tabs
    .filter((t) => eligible(t, windowId))
    .map((t) => ({
      id: `real-${t.id}`,
      browserId: t.id,
      windowId,
      title: t.title?.trim().slice(0, 120) || 'Untitled tab',
      url: t.url!,
      category: classify(t.url!, t.title ?? ''),
      pinned: false,
      audible: !!t.audible,
      protected: false,
    }));
}
export function propose(tabs: TabFact[]): ProposedGroup[] {
  return (Object.keys(categoryNames) as Category[]).flatMap((category) => {
    const members = tabs.filter(
      (t) => t.category === category && !t.protected && !t.pinned && t.browserId !== undefined,
    );
    return members.length
      ? [{ category, title: categoryNames[category], color: colors[category], tabs: members }]
      : [];
  });
}
function unchanged(original: TabFact, fresh: BrowserTab | undefined, windowId: number) {
  return (
    fresh &&
    eligible(fresh, windowId) &&
    fresh.url === original.url &&
    fresh.id === original.browserId
  );
}
/** Preflight every approved tab before the first mutation; recheck each group as well. */
export async function applyGroups(
  port: TabPort,
  plan: ProposedGroup[],
  approved: Set<number>,
  windowId: number,
): Promise<GroupResult> {
  const result: GroupResult = { applied: [], skipped: [], errors: [] };
  const selected = plan
    .map((g) => ({
      ...g,
      tabs: g.tabs.filter(
        (t) => !t.protected && !t.pinned && t.windowId === windowId && approved.has(t.browserId!),
      ),
    }))
    .filter((g) => g.tabs.length);
  if (!selected.length) return result;
  const preflight = await port.query(windowId);
  const changed = selected
    .flatMap((g) => g.tabs)
    .filter(
      (t) =>
        !unchanged(
          t,
          preflight.find((f) => f.id === t.browserId),
          windowId,
        ),
    );
  if (changed.length)
    return {
      ...result,
      errors: [
        `Nothing changed: ${changed.length} approved tab(s) moved, closed, navigated, or became protected. Refresh the preview.`,
      ],
    };
  for (const group of selected) {
    try {
      const fresh = await port.query(windowId);
      const safe = group.tabs.filter((t) =>
        unchanged(
          t,
          fresh.find((f) => f.id === t.browserId),
          windowId,
        ),
      );
      if (safe.length !== group.tabs.length) {
        result.skipped.push(`${group.title}: tabs changed while applying`);
        continue;
      }
      const groupId = await port.group(safe.map((t) => t.browserId!));
      // Record the real mutation before metadata update, which can independently fail.
      result.applied.push(`${group.title}: ${safe.length} tab(s) grouped (group ${groupId})`);
      await port.updateGroup(groupId, group.title, group.color);
    } catch (error) {
      result.errors.push(
        `${group.title}: ${error instanceof Error ? error.message : 'Chrome could not complete this group'}. Previous groups may already have changed.`,
      );
      break;
    }
  }
  return result;
}
