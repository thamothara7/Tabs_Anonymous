import { describe, expect, it } from 'vitest';
import { classify, duplicateGroups, normalizeUrl } from '../packages/game-core/classify';
import { demoCharacters } from '../packages/game-core/fixtures';
import { storyFor } from '../packages/game-core/events';
import { initialState, reducer, endingFor } from '../packages/game-core/reducer';
const voting = () => {
  let state = reducer(initialState(demoCharacters), { type: 'START' });
  for (let i = 0; i < 10; i++) state = reducer(state, { type: 'NEXT' });
  return state;
};
describe('safe metadata classification', () => {
  it('keeps different queries distinct and ignores fragments', () => {
    expect(normalizeUrl('https://example.com/search?q=a#heading')).toBe(
      'https://example.com/search?q=a',
    );
    expect(
      duplicateGroups([
        { id: 'a', url: 'https://x.test/?q=a' },
        { id: 'b', url: 'https://x.test/?q=b' },
      ]),
    ).toEqual([]);
    expect(duplicateGroups(demoCharacters)).toEqual([['tab-0', 'tab-5']]);
  });
  it('rejects internal URLs and lookalike hosts', () => {
    expect(normalizeUrl('chrome://settings')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(classify('https://github.com.evil.test')).toBe('other');
    expect(classify('https://docs.google.com/document/123')).toBe('study');
  });
});
describe('deterministic story and outcomes', () => {
  it('replays the same sequence and duplicate consequence exactly once', () => {
    expect(storyFor(demoCharacters, 42)).toEqual(storyFor(demoCharacters, 42));
    const first = voting();
    const second = voting();
    expect(first).toEqual(second);
    expect(first.phase).toBe('voting');
    expect(first.characters[0].confidence).toBe(demoCharacters[0].confidence - 12);
    expect(first.characters[0].grudges).toEqual(['tab-5']);
    expect(reducer(first, { type: 'NEXT' })).toBe(first);
  });
  it('cannot finish without a decision for every tab', () => {
    const state = voting();
    expect(reducer(state, { type: 'FINISH' })).toBe(state);
  });
  it('enforces six keep seats and lets the player reverse a choice', () => {
    let state = voting();
    for (let i = 0; i < 7; i++)
      state = reducer(state, { type: 'DECIDE', id: `tab-${i}`, fate: 'keep' });
    expect(state.characters.filter((c) => c.fate === 'keep')).toHaveLength(6);
    state = reducer(state, { type: 'DECIDE', id: 'tab-0', fate: 'retire' });
    state = reducer(state, { type: 'DECIDE', id: 'tab-6', fate: 'keep' });
    expect(state.characters[6].fate).toBe('keep');
    expect(state.characters[0].url).toBe(demoCharacters[0].url);
    expect(state.characters).toHaveLength(12);
  });
  it('supports a complete run and betrayal ending with no browser globals', () => {
    let state = voting();
    state = reducer(state, { type: 'DEFEND', id: 'tab-0' });
    for (const c of state.characters)
      state = reducer(state, { type: 'DECIDE', id: c.id, fate: 'retire' });
    expect(endingFor(state).title).toBe('The Betrayer');
    expect(reducer(state, { type: 'FINISH' }).phase).toBe('results');
  });
  it('ignores unknown targets and guards actions outside a session', () => {
    const state = initialState(demoCharacters);
    expect(reducer(state, { type: 'DEFEND', id: 'tab-0' })).toBe(state);
    expect(reducer(voting(), { type: 'SELECT', id: 'missing' }).selected).toBe('tab-0');
  });
  it('does not fabricate duplicates for unrelated tabs', () => {
    const deck = storyFor(demoCharacters.slice(1, 5));
    expect(deck.some((b) => b.cue === 'duplicate')).toBe(false);
  });
});
