import type { StretchPan } from '../common/bench.type.ts';

/** The finding a pan sample records next to its p95 row: `stretch L pan longest long task 112.0 ms`. */
export const panNoteOf = (size: string, pan: StretchPan): string =>
  `stretch ${size} pan longest long task ${pan.longestLongTaskMs.toFixed(1)} ms`;

/** The finding the L row records: `stretch L main JS heap 39.8 MB`. */
export const heapNoteOf = (heapMb: number): string => `stretch L main JS heap ${heapMb.toFixed(1)} MB`;

/** The finding a toggle records: `stretch tap pkg-000#e2e-ci attempts 2`, the double taps it took to flip the group's box. */
export const tapNoteOf = (id: string, attempts: number): string => `stretch tap ${id} attempts ${attempts}`;
