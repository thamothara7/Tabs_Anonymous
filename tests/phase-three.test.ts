import { describe, it, expect, vi, afterEach } from 'vitest';
import { demoCharacters } from '../packages/game-core/fixtures';
import { personalLine, reactionFor } from '../packages/game-core/dialogue';
import { initialState, reducer } from '../packages/game-core/reducer';
import { recapText } from '../packages/ui/recap';
import { createReel } from '../packages/ui/reel';
import { SessionAudio } from '../packages/ui/audio';

describe('personal dialogue and recap', () => {
  it('uses real title and domain, varies jokes, and refuses lookalike host hints', () => {
    const c = { ...demoCharacters[0], title: 'Two Sum interview practice' };
    expect(personalLine(c, 0)).toContain('Two Sum interview practice');
    expect(personalLine(c, 0)).toContain('two sum interview');
    expect(personalLine(c, 1)).not.toBe(personalLine(c, 0));
    expect(personalLine({ ...c, title: 'Binary tree traversal' }, 0)).toContain(
      'binary tree traversal',
    );
  });
  it('roasts duplicates and reacts to a defended tab being retired', () => {
    let s = reducer(initialState(demoCharacters), { type: 'START' });
    s = reducer(s, { type: 'ROAST', id: 'tab-0' });
    const first = s.actionLine;
    s = reducer(s, { type: 'ROAST', id: 'tab-0' });
    expect(s.actionLine).toContain('LeetCode');
    expect(s.actionLine).not.toBe(first);
    expect(s.history).toHaveLength(2);
    s = reducer(s, { type: 'DEFEND', id: 'tab-0' });
    expect(reactionFor(s, s.characters[0], 'retire')).toContain('LeetCode');
    expect(recapText(s)).toContain('SESSION HIGHLIGHTS');
    expect(recapText(s)).toContain(first!);
    expect(recapText(s)).not.toContain('https://');
    expect(JSON.stringify(createReel(s))).not.toContain('LeetCode');
  });
  it('preserves long award titles and describes an all-retired cast honestly', () => {
    const s = initialState(demoCharacters);
    s.characters = s.characters.map((c) => ({ ...c, fate: 'retire' }));
    expect(createReel(s).counts).toEqual([0, 0, 12]);
    s.characters[1].fate = 'keep';
    expect(createReel(s).chapters[4].title).toContain('Procrastinator');
    const reset = reducer(s, { type: 'RESET', characters: demoCharacters });
    expect(reset.seed).not.toBe(s.seed);
  });
});

describe('local speech lifecycle', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('aborts inference on mute and ignores late responses without creating a player', async () => {
    let complete!: (response: Response) => void;
    const fetcher = vi.fn(
      (_url: string, _options: RequestInit) =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    const player = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('Audio', player);
    const audio = new SessionAudio();
    const done = vi.fn(),
      fail = vi.fn();
    const pending = audio.speak('Private title', 'bm_george', 'neutral', true, done, fail);
    const request = fetcher.mock.calls[0];
    expect(request[0]).toBe('http://127.0.0.1:4317/kokoro/speech');
    audio.stop();
    expect((request[1].signal as AbortSignal).aborted).toBe(true);
    complete(new Response('RIFFfixture'));
    await pending;
    expect(player).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });
  it('reports a suspended audio device instead of claiming success', async () => {
    const resume = vi.fn();
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'suspended';
        resume = resume;
      },
    );
    await expect(new SessionAudio().unlock()).rejects.toThrow('suspended');
    expect(resume).toHaveBeenCalledOnce();
  });
});
