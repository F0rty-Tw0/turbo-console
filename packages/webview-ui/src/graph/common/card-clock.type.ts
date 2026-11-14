import type { TaskCanvas } from './task-canvas.type.ts';

/** What the card clock writes to and reads time from; `now` is page time, never a host timestamp. */
export type CardClockDeps = {
  readonly canvas: Pick<TaskCanvas, 'clocks'>;
  readonly now: () => number;
  readonly setInterval: (fn: () => void, ms: number) => number;
  readonly clearInterval: (id: number) => void;
  readonly isHidden: () => boolean;
};

/** The browser timers and visibility the controller hands the card clock. */
export type CardClockPorts = Pick<CardClockDeps, 'setInterval' | 'clearInterval' | 'isHidden'>;

/** A clocked task's elapsed ms as the host sent it, and the page time it arrived at. */
export type CardClockBase = {
  readonly elapsedMs: number;
  readonly receivedAt: number;
};
