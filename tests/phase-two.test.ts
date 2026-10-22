import { describe, expect, it } from 'vitest';
import { classify } from '../packages/game-core/classify';
import { featuredTabs } from '../packages/game-core/casting';
import { makeCharacter, demoCharacters } from '../packages/game-core/fixtures';
import { initialState, reducer } from '../packages/game-core/reducer';
import { encodeSession, decodeSession } from '../packages/game-core/session';
import { storyFor } from '../packages/game-core/events';
import { encodeSnapshot, restoreSnapshot } from '../apps/chrome-extension/session';
import { createReel } from '../packages/ui/reel';
const vote = () => {
  let s = reducer(initialState(demoCharacters), { type: 'START' });
  for (let i = 0; i < 10; i++) s = reducer(s, { type: 'NEXT' });
  return s;
};
describe('real-tab ensemble', () => {
  it.each([
    ['https://event.devpost.com', 'Hackathon', 'events'],
    ['https://devfolio.co/hackathons', 'Upcoming events', 'events'],
    ['https://www.pinterest.com', 'Pinterest - India', 'design'],
    ['https://www.figma.com/design/1', 'Draft', 'design'],
    ['https://example.org/resource', 'Java DSA Study Guide', 'study'],
    ['https://example.org/resource', 'Free Textures, Tutorials, and More', 'design'],
    ['https://devpost.com.attacker.test', 'Unrelated page', 'other'],
  ])('classifies local metadata without substring host matches: %s', (url, title, expected) =>
    expect(classify(url, title)).toBe(expected),
  );
  it('samples categories across a 200-tab window while preserving a duplicate pair', () => {
    const many = Array.from({ length: 199 }, (_, i) => ({
      ...demoCharacters[0],
      id: `code-${i}`,
      url: `https://github.com/x/${i}`,
    }));
    many[1].url = many[0].url;
    const video = { ...demoCharacters[1], id: 'last-video' };
    const selected = featuredTabs([...many, video]);
    expect(selected).toHaveLength(12);
    expect(selected.map((c) => c.id)).toContain('last-video');
    expect(selected.slice(0, 2).map((c) => c.id)).toEqual(['code-0', 'code-1']);
    expect(featuredTabs([...many, video])).toEqual(selected);
    expect(featuredTabs(many, 0)).toEqual([]);
  });
  it('retains the full title for inspection and does not invent absent video tabs', () => {
    const c = makeCharacter(
      {
        ...demoCharacters[0],
        category: 'events',
        title: 'A very long conference title that needs more than thirty two characters',
      },
      0,
    );
    expect(c.name).toBe(c.title);
    const story = storyFor([c]);
    expect(story.some((b) => b.line.includes('video tab'))).toBe(false);
    expect(story[1].line).toContain('A very long conference title');
  });
});
describe('verdicts, speakers, and checkpoints', () => {
  it('keeps the actual actor when another character is selected', () => {
    let s = reducer(vote(), { type: 'SPEAK', id: 'tab-1' });
    s = reducer(s, { type: 'SELECT', id: 'tab-0' });
    expect(s.actionTarget).toBe('tab-1');
    expect(s.selected).toBe('tab-0');
  });
  it('undoes repeated verdicts without double-counting and restores the six-seat limit', () => {
    let s = vote();
    for (let i = 0; i < 6; i++) s = reducer(s, { type: 'DECIDE', id: `tab-${i}`, fate: 'keep' });
    const before = s;
    s = reducer(s, { type: 'DECIDE', id: 'tab-0', fate: 'keep' });
    expect(s).toBe(before);
    s = reducer(s, { type: 'DECIDE', id: 'tab-0', fate: 'retire' });
    s = reducer(s, { type: 'DECIDE', id: 'tab-6', fate: 'keep' });
    s = reducer(s, { type: 'UNDO_DECISION' });
    s = reducer(s, { type: 'UNDO_DECISION' });
    expect(s.characters.filter((c) => c.fate === 'keep')).toHaveLength(6);
    expect(s.characters[6].fate).toBe('undecided');
    expect(s.decisions).toBe(6);
  });
  it('restores decisions and undo after reload, clearing transient speech', () => {
    const s = reducer(vote(), { type: 'DECIDE', id: 'tab-0', fate: 'retire' });
    const restored = decodeSession(encodeSession(s), demoCharacters)!;
    expect(restored.characters[0].fate).toBe('retire');
    expect(restored.actionLine).toBeNull();
    expect(restored.actionTarget).toBeNull();
    expect(reducer(restored, { type: 'UNDO_DECISION' }).characters[0].fate).toBe('undecided');
  });
  it('rejects incompatible, expired, or malformed checkpoints', () => {
    const s = vote();
    expect(decodeSession('{bad', demoCharacters)).toBeNull();
    expect(decodeSession(encodeSession(s, 1), demoCharacters)).toBeNull();
    expect(decodeSession(encodeSession(s), demoCharacters.slice(1))).toBeNull();
    const bad = JSON.parse(encodeSession(s));
    bad.state.characters[0].loyalty = 1000;
    expect(decodeSession(JSON.stringify(bad), demoCharacters)).toBeNull();
    const navigated = structuredClone(demoCharacters);
    navigated[0].url = 'https://new.example';
    expect(decodeSession(encodeSession(s), navigated)).toBeNull();
  });
  it('restores extension snapshots only from fresh matching metadata', () => {
    const facts = demoCharacters.slice(0, 3).map((c, i) => ({ ...c, browserId: i, windowId: 1 }));
    const raw = encodeSnapshot(facts, 1);
    expect(restoreSnapshot(raw, facts, 1)).toEqual(facts);
    expect(restoreSnapshot(raw, facts, 2)).toBeNull();
    expect(restoreSnapshot(raw, facts.slice(1), 1)).toBeNull();
    expect(
      restoreSnapshot(
        raw,
        facts.map((c) => ({ ...c, title: 'Fresh title' })),
        1,
      )?.[0].title,
    ).toBe('Fresh title');
    expect(
      restoreSnapshot(
        raw,
        facts.map((c) => ({ ...c, url: 'https://changed.test' })),
        1,
      ),
    ).toBeNull();
  });
  it('exports an image without tab titles, URLs, or browser IDs', () => {
    const s = vote();
    s.characters[0].name = 'PRIVATE CLIENT NAME';
    s.characters[0].url = 'https://private.example';
    const imageData = JSON.stringify(createReel(s));
    expect(imageData).not.toContain('PRIVATE CLIENT');
    expect(imageData).not.toContain('private.example');
  });
});
