// Show / hide rules for the playback control bar, kept free of React and the
// DOM so the timing can be unit-tested with fake timers.

export interface TimerApi {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const browserTimers: TimerApi = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export class ControlBarVisibility {
  private visible = false;
  private hovering = false;
  private handle: unknown = null;
  private delayMs: number;
  private readonly onChange: (visible: boolean) => void;
  private readonly timers: TimerApi;

  constructor(delayMs: number, onChange: (visible: boolean) => void, timers: TimerApi = browserTimers) {
    this.delayMs = delayMs;
    this.onChange = onChange;
    this.timers = timers;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  setDelay(ms: number): void {
    this.delayMs = ms;
  }

  /** Mouse / pointer / touch movement or a key press. */
  activity(): void {
    this.show();
    if (!this.hovering) this.schedule();
  }

  enterBar(): void {
    this.hovering = true;
    this.cancel();
    this.show();
  }

  leaveBar(): void {
    this.hovering = false;
    this.schedule();
  }

  /** Pointer left the window: hide immediately. */
  leaveWindow(): void {
    this.hovering = false;
    this.cancel();
    this.set(false);
  }

  dispose(): void {
    this.cancel();
  }

  private show(): void {
    this.set(true);
  }

  private schedule(): void {
    this.cancel();
    this.handle = this.timers.set(() => {
      this.handle = null;
      this.set(false);
    }, this.delayMs);
  }

  private cancel(): void {
    if (this.handle != null) {
      this.timers.clear(this.handle);
      this.handle = null;
    }
  }

  private set(v: boolean): void {
    if (v === this.visible) return;
    this.visible = v;
    this.onChange(v);
  }
}
