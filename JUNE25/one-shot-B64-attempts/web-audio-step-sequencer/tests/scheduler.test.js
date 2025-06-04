import { describe, it, expect, vi } from "vitest";
import { createScheduler } from "../src/audio/scheduler.js";

vi.useFakeTimers();

describe("scheduler", () => {
  it("calls playStep", () => {
    const fakeProject = { channels: [], meta: { bpm: 120, steps: 16 } };
    const store = { setState: vi.fn(), getState: () => ({}) };
    const sched = createScheduler(fakeProject, store);
    sched.start();
    vi.advanceTimersByTime(100);
    expect(sched.isPlaying()).toBe(true);
    sched.stop();
    expect(sched.isPlaying()).toBe(false);
  });
});
