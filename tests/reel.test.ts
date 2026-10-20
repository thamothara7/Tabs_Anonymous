import { describe, it, expect } from 'vitest';
import { createReel, chapterAt } from '../packages/ui/reel';
import { initialState } from '../packages/game-core/reducer';
import { demoCharacters } from '../packages/game-core/fixtures';

describe('shareable reel boundary', () => {
  it('only exports aggregate verdicts and authored copy even when all metadata is private', () => {
    const state = initialState(
      demoCharacters.map((c, i) => ({
        ...c,
        name: `SECRET-${i}`,
        title: `PRIVATE-${i}`,
        url: 'https://private.test/account',
        fate: i < 3 ? 'keep' : i < 8 ? 'group' : 'retire',
      })),
    );
    state.history = ['PRIVATE conversation'];
    const reel = createReel(state);
    expect(reel.counts).toEqual([3, 5, 4]);
    expect(reel.chapters.map((c) => c.count)).toEqual([12, 3, 5, 4, 5]);
    expect(JSON.stringify(reel)).not.toMatch(/SECRET|PRIVATE|private.test|https:/);
  });
  it('handles empty and all-retired casts without inventing survivors', () => {
    const empty = createReel(initialState([]));
    expect(empty.counts).toEqual([0, 0, 0]);
    expect(empty.chapters[1].line).toContain('Nobody');
    const retired = createReel(initialState(demoCharacters.map((c) => ({ ...c, fate: 'retire' }))));
    expect(retired.counts).toEqual([0, 0, 12]);
    expect(retired.chapters[3].title).toContain('12');
    expect([
      chapterAt(-1),
      chapterAt(0),
      chapterAt(3),
      chapterAt(14.9),
      chapterAt(15),
      chapterAt(100),
    ]).toEqual([0, 0, 1, 4, 4, 4]);
  });
});
