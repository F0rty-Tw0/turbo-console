import { LAYOUT_SETTLE_MS } from './graph.const.ts';

/**
 * The ELK timeout a 280 or 300 task layout opens with: under the parallel suite a Windows runner took over the
 * production 5 s and drew the fallback (F-G24-1), so these rows give ELK 6x that before the fallback.
 */
export const LARGE_LAYOUT_TIMEOUT_MS = 30_000;

/** How long to wait for a layout opened with `LARGE_LAYOUT_TIMEOUT_MS` to settle: its timeout plus the usual settle room. */
export const LARGE_LAYOUT_SETTLE_MS = LARGE_LAYOUT_TIMEOUT_MS + LAYOUT_SETTLE_MS;
