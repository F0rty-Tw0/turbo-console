import type { Mock, Mocked } from 'vitest';

import type { FlowPen, GraphFlowDeps } from '../../common/flow.type.ts';

/** The pen calls whose spy types `Mocked` cannot build: `stroke` takes no path, and `clearRect` is not a pen call. */
type FlowPenSpies = {
  readonly stroke: Mock<() => void>;
  readonly clearRect: Mock<CanvasRenderingContext2D['clearRect']>;
};

/** A 2D context double: every pen call a spy, plus the `clearRect` the flow clears with. */
export type FlowPenMock = Mocked<Omit<FlowPen, 'stroke'>> & FlowPenSpies;

type FlowClockControls = {
  /** Moves the clock on by `ms` in 16 ms frames; each frame runs the timers due by then, then the frames asked for before it. */
  readonly advance: (ms: number) => void;
  /** How many frames are asked for and not yet run or cancelled. */
  readonly pendingFrames: () => number;
};

/** A fake frame and timer clock for `GraphFlow`. */
export type FlowClockMock = Pick<GraphFlowDeps, 'now' | 'frame' | 'cancelFrame' | 'after' | 'cancelAfter'> & FlowClockControls;
