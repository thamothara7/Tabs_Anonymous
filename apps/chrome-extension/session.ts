import type { TabFact } from '../../packages/game-core/types';
export const SNAPSHOT_KEY = 'ta-window-snapshot-v2';
export function encodeSnapshot(tabs: TabFact[], windowId: number): string {
  return JSON.stringify({
    version: 2,
    windowId,
    savedAt: Date.now(),
    tabs: tabs.map((t) => ({ id: t.browserId, url: t.url })),
  });
}
/** Reconstruct metadata from a fresh permitted scan, never from stored titles or categories. */
export function restoreSnapshot(raw: string, fresh: TabFact[], windowId: number): TabFact[] | null {
  try {
    const saved = JSON.parse(raw);
    if (
      saved.version !== 2 ||
      saved.windowId !== windowId ||
      !Number.isFinite(saved.savedAt) ||
      Date.now() - saved.savedAt > 86400000 ||
      saved.savedAt > Date.now() + 60000 ||
      !Array.isArray(saved.tabs) ||
      !saved.tabs.length ||
      saved.tabs.length > 10000
    )
      return null;
    const ids = new Set<number>();
    return saved.tabs.map((t: { id: number; url: string }) => {
      if (!t || !Number.isInteger(t.id) || ids.has(t.id)) throw new Error('Invalid tab');
      ids.add(t.id);
      const tab = fresh.find((f) => f.browserId === t.id && f.url === t.url);
      if (!tab) throw new Error('Snapshot changed');
      return tab;
    });
  } catch {
    return null;
  }
}
