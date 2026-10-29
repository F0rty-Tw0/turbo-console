import { IS_MAC_RUNNER } from './graph.const.ts';

/**
 * About 690 ms pinned (685 to 701) with tracing off, at the first notch past the rows' 0.5 zoom floor (about 0.51);
 * the budget keeps about the grouped pan's 3.4x room. It guards the pan with rows shown and the canvas detail drawn at
 * this zoom, not per-row widget cost: with 2 boxes and 4 buttons in view, a mutant forcing a layout read on every widget
 * style write measured 693 ms, inside the base's spread.
 */
export const ROWS_PAN_MS = IS_MAC_RUNNER ? 4800 : 2400;

/** The grouped pans' slowest step; macOS read up to 52 ms there (C58), so it gets about 1.7x, Linux and Windows the 50 ms long-task line. */
export const GROUPED_PAN_STEP_MS = IS_MAC_RUNNER ? 90 : 50;

/** At the first zoom that shows header rows, 2 of the 30 boxes of `largeState()` overlap the canvas, each with its 2 buttons. */
export const ROWS_BOXES_IN_VIEW = 2;

/** The header buttons those 2 boxes show. */
export const ROWS_BUTTONS_SHOWN = 4;
