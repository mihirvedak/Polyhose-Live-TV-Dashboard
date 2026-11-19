import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlBarVisibility } from '../../tv/lib/controlVisibility';

describe('control bar visibility timer', () => {
  let changes: boolean[];
  let bar: ControlBarVisibility;

  beforeEach(() => {
    vi.useFakeTimers();
    changes = [];
    bar = new ControlBarVisibility(3000, (v) => changes.push(v));
  });
  afterEach(() => {
    bar.dispose();
    vi.useRealTimers();
  });

  it('is hidden until movement, then hides 3 s after the last movement', () => {
    expect(bar.isVisible).toBe(false);
    bar.activity();
    expect(bar.isVisible).toBe(true);
    vi.advanceTimersByTime(2000);
    bar.activity(); // movement restarts the timer
    vi.advanceTimersByTime(2999);
    expect(bar.isVisible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(bar.isVisible).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it('stays visible while hovered and restarts the timer on leave', () => {
    bar.activity();
    bar.enterBar();
    vi.advanceTimersByTime(60_000);
    bar.activity(); // moving over the bar must not schedule a hide
    vi.advanceTimersByTime(60_000);
    expect(bar.isVisible).toBe(true);
    bar.leaveBar();
    vi.advanceTimersByTime(2999);
    expect(bar.isVisible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(bar.isVisible).toBe(false);
  });

  it('hides immediately when the pointer leaves the window', () => {
    bar.activity();
    bar.enterBar();
    bar.leaveWindow();
    expect(bar.isVisible).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(changes).toEqual([true, false]);
  });

  it('uses the configured delay', () => {
    bar.setDelay(5000);
    bar.activity();
    vi.advanceTimersByTime(4999);
    expect(bar.isVisible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(bar.isVisible).toBe(false);
  });
});
