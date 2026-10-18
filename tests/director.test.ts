import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimationDirector } from '../packages/animation/director';
describe('animation director', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }));
  afterEach(() => vi.useRealTimers());
  it('freezes progress while paused, then resumes', () => {
    const d = new AnimationDirector(),
      progress = vi.fn(),
      done = vi.fn();
    d.play(1000, progress, done);
    vi.advanceTimersByTime(300);
    d.pause();
    const elapsed = progress.mock.lastCall?.[0];
    vi.advanceTimersByTime(5000);
    expect(progress.mock.lastCall?.[0]).toBe(elapsed);
    expect(done).not.toHaveBeenCalled();
    d.resume();
    vi.advanceTimersByTime(700);
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('skips exactly once and cancels stale callbacks', () => {
    const d = new AnimationDirector(),
      done = vi.fn();
    d.play(1000, () => {}, done);
    d.skipCurrent();
    d.skipCurrent();
    vi.advanceTimersByTime(3000);
    expect(done).toHaveBeenCalledTimes(1);
    d.play(1000, () => {}, done);
    d.cancelAll();
    vi.advanceTimersByTime(2000);
    expect(done).toHaveBeenCalledTimes(1);
  });
});
