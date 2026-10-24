import type { FlowClockMock } from '../common/graph-flow.type.ts';

const FRAME_MS = 16;

type Timer = {
  readonly at: number;
  readonly run: () => void;
};

/** Runs, once each, the timers due at `time`. */
const runDueTimers = (timers: Map<number, Timer>, time: number): void => {
  const isDue = ([, timer]: [number, Timer]): boolean => timer.at <= time;
  const all = [...timers];
  const due = all.filter(isDue);

  for (const [id, timer] of due) {
    timers.delete(id);
    timer.run();
  }
};

/** Runs the frames asked for so far; a frame one of them asks for waits for the next call. */
const runFrames = (frames: Map<number, () => void>): void => {
  const runs = frames.values();
  const due = [...runs];

  frames.clear();

  for (const run of due) run();
};

/** A clock at 0 that moves only on `advance`; frame and timer ids share one counter. */
export const flowClockMock = (): FlowClockMock => {
  const frames = new Map<number, () => void>();
  const timers = new Map<number, Timer>();
  let time = 0;
  let lastId = 0;
  const nextId = (): number => {
    lastId += 1;

    return lastId;
  };
  const frame = (run: () => void): number => {
    const id = nextId();

    frames.set(id, run);

    return id;
  };
  const after = (run: () => void, ms: number): number => {
    const id = nextId();

    timers.set(id, { at: time + ms, run });

    return id;
  };
  const advance = (ms: number): void => {
    for (let step = 0; step < ms; step += FRAME_MS) {
      time += Math.min(FRAME_MS, ms - step);
      runDueTimers(timers, time);
      runFrames(frames);
    }
  };
  const clock: FlowClockMock = {
    now: (): number => time,
    frame,
    cancelFrame: (id: number): void => void frames.delete(id),
    after,
    cancelAfter: (id: number): void => void timers.delete(id),
    advance,
    pendingFrames: (): number => frames.size
  };

  return clock;
};
