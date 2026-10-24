/** One dash period moves along its edge every `FLOW_CYCLE_MS` (spec 3.5: one cycle ≤ 200 ms). */
export const FLOW_CYCLE_MS = 160;

/** A dash and the gap after it are each `FLOW_DASH_PX` long, so one period is twice that. */
export const FLOW_DASH_PX = 6;

export const FLOW_LINE_PX = 2;

/** The flow stops this long after it started or the pointer last moved over the canvas. */
export const FLOW_IDLE_MS = 3000;

export const FLOW_CLASS = 'graph-flow';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
