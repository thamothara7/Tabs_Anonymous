import { it, expect } from 'vitest';
import { demoCharacters } from '../packages/game-core/fixtures';
import { initialState, reducer } from '../packages/game-core/reducer';
import { contextLines, witnessFor } from '../packages/game-core/dialogue';
import { caseSummary, relatedTabs, topicsOf } from '../packages/game-core/context';
import { storyFor } from '../packages/game-core/events';

const cast = [
  {
    ...demoCharacters[0],
    id: 'java',
    title: 'Java arrays practice',
    url: 'https://leetcode.com/problems/arrays',
  },
  {
    ...demoCharacters[2],
    id: 'study',
    title: 'Java memory course',
    url: 'https://study.test/java',
  },
  {
    ...demoCharacters[1],
    id: 'video',
    title: 'Jazz piano live',
    url: 'https://youtube.com/watch?v=piano',
  },
];
it('writes from current title topics, related peers, site counts and audible flags', () => {
  expect(topicsOf(cast[0])).toEqual(['java', 'arrays', 'practice']);
  expect(relatedTabs(cast[0], cast)[0].id).toBe('study');
  expect(caseSummary(cast)).toContain('2 titles mention java');
  const lines = contextLines(cast[0], cast).join(' ');
  expect(lines).toContain('Java memory course');
  expect(lines).toContain('java arrays practice');
  expect(lines).not.toContain('noise');
  expect(contextLines({ ...cast[0], audible: true }, cast).join(' ')).toContain(
    'sound is coming from leetcode.com',
  );
  const changed = [{ ...cast[0], title: 'Rust ownership exercise' }, ...cast.slice(1)];
  expect(storyFor(changed, 42)[1].line).not.toBe(storyFor(cast, 42)[1].line);
  expect(contextLines(changed[0], changed).join(' ')).not.toContain('both mention java');
});
it('lets a related witness speak without changing the selected defendant and remembers decisions', () => {
  let state = reducer(initialState(cast), { type: 'START' });
  state = reducer(state, { type: 'WITNESS', id: 'java' });
  expect(state.selected).toBe('java');
  expect(state.actionTarget).toBe('study');
  expect(state.actionLine).toContain('both mention java');
  expect(state.characters.find((c) => c.id === 'study')?.emotion).toBe('suspicious');
  const first = state.actionLine;
  state = reducer(state, { type: 'WITNESS', id: 'java' });
  expect(state.actionTarget).toBe('video');
  expect(state.actionLine).not.toBe(first);
  state = { ...state, phase: 'voting' };
  state = reducer(state, { type: 'DECIDE', id: 'java', fate: 'retire' });
  expect(witnessFor(state, state.characters[0])?.line).toContain('appeal');
  const alone = reducer(initialState(cast.slice(0, 1)), { type: 'START' });
  expect(reducer(alone, { type: 'WITNESS', id: 'java' })).toBe(alone);
});
it('prefers a duplicate witness over topic overlap and never reads URL query contents into a joke', () => {
  const duplicate = { ...cast[0], id: 'twin', title: 'A different title' };
  const room = [...cast, duplicate];
  const state = initialState(room);
  expect(witnessFor(state, room[0])?.speaker.id).toBe('twin');
  expect(witnessFor(state, room[0])?.line).toContain('same address');
  expect(
    contextLines({ ...cast[0], url: 'https://safe.test/?secret=private-value' }, room).join(' '),
  ).not.toContain('private-value');
});

it('bounds metadata-derived lines for speech and checkpoint storage, and varies a lone witness', () => {
  const long = cast.map((c) => ({
    ...c,
    title: 'x'.repeat(8000),
    url: `https://${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.test/?private=secret`,
  }));
  let state = reducer(initialState(long.slice(0, 2)), { type: 'START' });
  state = reducer(state, { type: 'WITNESS', id: state.selected });
  const first = state.actionLine;
  expect(first!.length).toBeLessThanOrEqual(500);
  state = reducer(state, { type: 'WITNESS', id: state.selected });
  expect(state.actionLine).not.toBe(first);
  for (const line of contextLines(long[0], long)) expect(line.length).toBeLessThan(450);
});
