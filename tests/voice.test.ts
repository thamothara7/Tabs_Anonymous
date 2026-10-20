import { describe, it, expect } from 'vitest';
import { autoCast, deliveryFor } from '../packages/ui/voices';
import { demoCharacters } from '../packages/game-core/fixtures';
import { initialState, reducer } from '../packages/game-core/reducer';
import { decodeSession, encodeSession } from '../packages/game-core/session';

describe('distinct casting and delivery', () => {
  it('reserves the therapist and distributes 12 separate tab voices when available', () => {
    const voices = Array.from({ length: 13 }, (_, i) => ({
      id: `voice${i}`,
      name: i === 5 ? 'Deep authoritative narrator' : `Actor ${i}`,
    }));
    const map = autoCast(voices, demoCharacters);
    expect(map.therapist).toBe('voice5');
    expect(new Set(Object.values(map)).size).toBe(13);
    expect(deliveryFor(undefined, 'talk').rate).toBeLessThan(1);
    expect(deliveryFor(demoCharacters[0], 'retire').emotion).toBe('crying');
    expect(deliveryFor(demoCharacters[0], 'victory').emotion).toBe('victorious');
  });
  it('avoids repeated confession punchlines across 12 same-category tabs and reload', () => {
    const cast = Array.from({ length: 12 }, (_, i) => ({
      ...demoCharacters[0],
      id: `c${i}`,
      title: `Project ${i}`,
      name: `Project ${i}`,
      url: `https://github.com/test/${i}`,
    }));
    let s = reducer(initialState(cast), { type: 'START' });
    const lines: string[] = [];
    for (const c of cast) {
      s = reducer(s, { type: 'SPEAK', id: c.id });
      lines.push(s.actionLine!.split('”: ')[1]);
    }
    expect(new Set(lines).size).toBe(12);
    const restored = decodeSession(encodeSession(s), cast)!;
    expect(restored.history).toEqual(s.history);
    const next = reducer(restored, { type: 'SPEAK', id: cast[0].id });
    expect(lines).not.toContain(next.actionLine!.split('”: ')[1]);
  });
});
