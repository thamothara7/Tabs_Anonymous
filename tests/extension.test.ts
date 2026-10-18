import { describe, expect, it, vi } from 'vitest';
import {
  applyGroups,
  propose,
  snapshot,
  type BrowserTab,
  type TabPort,
} from '../apps/chrome-extension/bridge';
const tab = (id: number, patch: Partial<BrowserTab> = {}): BrowserTab => ({
  id,
  windowId: 1,
  pinned: false,
  incognito: false,
  title: `Tab ${id}`,
  url: `https://example.com/${id}`,
  ...patch,
});
function mockPort(tabs: BrowserTab[]): TabPort {
  return {
    query: vi.fn(async () => tabs),
    group: vi.fn(async () => 4),
    updateGroup: vi.fn(async () => ({})),
  };
}
describe('extension boundary', () => {
  it('excludes protected, internal, private, navigating, and other-window tabs', () => {
    expect(
      snapshot(
        [
          tab(1),
          tab(2, { pinned: true }),
          tab(3, { incognito: true }),
          tab(4, { url: 'chrome://settings' }),
          tab(5, { windowId: 2 }),
          tab(6, { pendingUrl: 'https://new.test' }),
        ],
        1,
      ).map((t) => t.browserId),
    ).toEqual([1]);
  });
  it('never mutates anything for an empty approval/cancel', async () => {
    const tabs = [tab(1)];
    const port = mockPort(tabs);
    await applyGroups(port, propose(snapshot(tabs, 1)), new Set(), 1);
    expect(port.group).not.toHaveBeenCalled();
    expect(port.query).not.toHaveBeenCalled();
  });
  it('only groups explicitly approved IDs', async () => {
    const tabs = [tab(1), tab(2)];
    const port = mockPort(tabs);
    const result = await applyGroups(port, propose(snapshot(tabs, 1)), new Set([1]), 1);
    expect(port.group).toHaveBeenCalledWith([1]);
    expect(result.applied).toHaveLength(1);
  });
  it.each([
    { pinned: true },
    { windowId: 2 },
    { url: 'https://changed.test' },
    { incognito: true },
  ])('aborts before mutations if a tab changes: %j', async (patch) => {
    const original = [tab(1), tab(2)];
    const port = mockPort([tab(1), tab(2, patch)]);
    const result = await applyGroups(port, propose(snapshot(original, 1)), new Set([1, 2]), 1);
    expect(result.errors).toHaveLength(1);
    expect(port.group).not.toHaveBeenCalled();
  });
  it('aborts when a tab disappeared', async () => {
    const port = mockPort([]);
    const result = await applyGroups(port, propose(snapshot([tab(1)], 1)), new Set([1]), 1);
    expect(result.errors).toHaveLength(1);
    expect(port.group).not.toHaveBeenCalled();
  });
  it('truthfully reports a group created before naming failed', async () => {
    const tabs = [tab(1)];
    const port = mockPort(tabs);
    port.updateGroup = vi.fn(async () => {
      throw new Error('naming failed');
    });
    const result = await applyGroups(port, propose(snapshot(tabs, 1)), new Set([1]), 1);
    expect(result.applied).toHaveLength(1);
    expect(result.errors[0]).toContain('naming failed');
  });
  it('handles 200 tabs without losing their grouping proposal', () => {
    const tabs = snapshot(
      Array.from({ length: 200 }, (_, i) => tab(i)),
      1,
    );
    expect(tabs).toHaveLength(200);
    expect(propose(tabs)[0].tabs).toHaveLength(200);
  });
});
