/** One dash period moves along its edge every `FLOW_CYCLE_MS` (spec 3.5: one cycle ≤ 200 ms). */
export const FLOW_CYCLE_MS = 160;

/** A dash and the gap after it are each `FLOW_DASH_PX` long, so one period is twice that. */
export const FLOW_DASH_PX = 6;

export const FLOW_LINE_PX = 2;

/** The flow stops this long after it started or the pointer last moved over the canvas. */
export const FLOW_IDLE_MS = 3000;

/**
 * Above this many highlighted task edges the flow does not start and the static highlight stays: the dashed stroke
 * costs about 19 ms a frame with 400 lit edges (7,440 ms of main-thread CPU per measure, against 150 ms with the flow
 * off; slice 3 performance review), far over the 16 ms frame.
 */
export const FLOW_EDGE_LIMIT = 50;

export const FLOW_CLASS = 'graph-flow';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
