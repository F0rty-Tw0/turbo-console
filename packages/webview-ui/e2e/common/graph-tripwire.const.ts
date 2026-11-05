import { IS_MAC_RUNNER } from './graph.const.ts';

/**
 * About 690 ms pinned (685 to 701) with tracing off, at the first notch past the rows' 0.5 zoom floor (about 0.51);
 * the budget keeps about the grouped pan's 3.4x room. It guards the pan with rows shown and the canvas detail drawn at
 * this zoom, not per-row widget cost: with 2 boxes and 4 buttons in view, a mutant forcing a layout read on every widget
 * style write measured 693 ms, inside the base's spread.
 */
export const ROWS_PAN_MS = IS_MAC_RUNNER ? 4800 : 2400;

/**
 * Wall time for a pan CPU tripwire, which pans three times: macOS CI took up to 1.5 min for the header-rows one and
 * timed out once at `test.slow()`'s 90 s (run 41857829802), so about 2x that. A timeout, not a budget: the CPU budget
 * is the gate.
 */
export const PAN_CPU_TEST_TIMEOUT_MS = 180_000;

/** Measured runs per CPU tripwire: the median of three keeps one spiked run on a slow CI host from failing a budget. */
export const CPU_RUNS = 3;

/** The grouped pans' slowest step; macOS read up to 52 ms there (C58), so it gets about 1.7x, Linux and Windows the 50 ms long-task line. */
export const GROUPED_PAN_STEP_MS = IS_MAC_RUNNER ? 90 : 50;

/** At the first zoom that shows header rows, 2 of the 30 boxes of `largeState()` overlap the canvas, each with its 2 buttons. */
export const ROWS_BOXES_IN_VIEW = 2;

/** The header buttons those 2 boxes show. */
export const ROWS_BUTTONS_SHOWN = 4;

/** The first-frame budget of the 14-package target-like flat row, where ELK takes little of the frame. */
export const FLAT_FIRST_FRAME_MS = 2000;

/** Five folders of `largeState()` that sit well inside the canvas after Fit and the zoom to 120 px boxes. */
export const TOGGLED_FOLDERS = ['group-2', 'group-3', 'group-4', 'group-12', 'group-13'];
