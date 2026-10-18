/** One clock owns the active story beat. Skip commits completion exactly once. */
export class AnimationDirector {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private elapsed = 0;
  private last = 0;
  private paused = false;
  private duration = 0;
  private progress: (elapsed: number) => void = () => {};
  private done: (() => void) | undefined;
  play(duration: number, progress: (elapsed: number) => void, done: () => void) {
    this.cancelAll();
    this.elapsed = 0;
    this.duration = duration;
    this.progress = progress;
    this.done = done;
    this.last = performance.now();
    this.progress(0);
    this.tick();
  }
  private tick = () => {
    if (!this.done) return;
    const now = performance.now();
    if (!this.paused) this.elapsed += now - this.last;
    this.last = now;
    this.progress(Math.min(this.elapsed, this.duration));
    if (this.elapsed >= this.duration) this.skipCurrent();
    else this.timer = setTimeout(this.tick, 50);
  };
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this.last = performance.now();
  }
  skipCurrent() {
    const done = this.done;
    this.cancelAll();
    done?.();
  }
  cancelAll() {
    clearTimeout(this.timer);
    this.done = undefined;
  }
}
