import { describe, it, expect, vi, afterEach } from 'vitest';
import { demoCharacters } from '../packages/game-core/fixtures';
import { personalLine, reactionFor } from '../packages/game-core/dialogue';
import { initialState, reducer } from '../packages/game-core/reducer';
import { recapText, recapSvg } from '../packages/ui/recap';
import { SessionAudio } from '../packages/ui/audio';

describe('personal dialogue and recap', () => {
  it('uses real title and domain, varies jokes, and refuses lookalike host hints', () => {
    const c = { ...demoCharacters[0], title: 'Two Sum interview practice' };
    expect(personalLine(c, 0)).toContain('Two Sum interview practice');
    expect(personalLine(c, 0)).toContain('coding problem');
    expect(personalLine(c, 1)).not.toBe(personalLine(c, 0));
    expect(
      personalLine({ ...c, url: 'https://leetcode.com.evil.test', title: 'Unrelated' }, 0),
    ).not.toContain('coding problem');
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
    expect(recapSvg(s)).not.toContain('LeetCode');
  });
  it('wraps long award titles and describes an all-retired cast honestly', () => {
    const s = initialState(demoCharacters);
    s.characters = s.characters.map((c) => ({ ...c, fate: 'retire' }));
    expect(recapSvg(s)).toContain('balcony is sold out');
    s.characters[1].fate = 'keep';
    expect(recapSvg(s)).toContain('<tspan x="72" dy="55">Procrastinator</tspan>');
    const reset = reducer(s, { type: 'RESET', characters: demoCharacters });
    expect(reset.seed).not.toBe(s.seed);
  });
});

describe('local speech lifecycle', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('never uses remote voices, and cancels old speech before speaking', () => {
    const local = { voiceURI: 'local', localService: true, lang: 'en-US' };
    const remote = { voiceURI: 'remote', localService: false, lang: 'en-US' };
    const synth = {
      getVoices: () => [remote, local],
      cancel: vi.fn(),
      resume: vi.fn(),
      speak: vi.fn(),
    };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor(public text: string) {}
      },
    );
    const audio = new SessionAudio();
    expect(audio.voices()).toEqual([local]);
    audio.speak('Private title', 'remote', 1, vi.fn());
    expect(synth.speak).not.toHaveBeenCalled();
    audio.speak('Private title', 'local', 1.1, vi.fn());
    expect(synth.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Private title', voice: local, pitch: 1.1 }),
    );
    audio.stop();
    expect(synth.cancel).toHaveBeenCalledTimes(3);
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
