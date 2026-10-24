import type { AtomResult } from '../../common/atom-result.type.ts';

export const A = '@fx/e2e#e2e-ci--tests/a.spec.ts';

export const B = '@fx/e2e#e2e-ci--tests/b fails.spec.ts';

const L = '@fx/e2e#e2e-ci--tests/live.spec.ts';

export const C = '@fx/e2e#e2e-ci--tests/nested/c.spec.ts';

export const FILE_IDS: ReadonlySet<string> = new Set([A, B, L, C]);

/** The fixtures, oldest first; fixture `i` (1-based) is written `10 * i` seconds after `OLDEST`. */
export const RUN_FIXTURES = ['run-1-all-miss', 'run-2-a-hit', 'run-3-b-only', 'run-4-definitions-copy', 'run-5-b-fixed'];

/** Seconds since the epoch, before every fixture mtime. */
export const OLDEST = 1_760_000_000;

/** Runs 1-5: the newest appearance of every id, all from run 5. */
export const NEWEST_OF_ALL: ReadonlyMap<string, AtomResult> = new Map([
  [A, { outcome: 'cached', durationMs: 0, endedAt: 1792868587634 }],
  [B, { outcome: 'passed', durationMs: 1129, endedAt: 1792868588776 }],
  [L, { outcome: 'passed', durationMs: 1106, endedAt: 1792868588740 }],
  [C, { outcome: 'cached', durationMs: 0, endedAt: 1792868587634 }]
]);

/** Runs 1-4: older appearances fill what newer files lack. */
export const WITHOUT_RUN_5: ReadonlyMap<string, AtomResult> = new Map([
  [A, { outcome: 'cached', durationMs: 0, endedAt: 1792868555266 }],
  [B, { outcome: 'failed', durationMs: 1085, endedAt: 1792868575830 }],
  [L, { outcome: 'passed', durationMs: 687, endedAt: 1792868555266 }],
  [C, { outcome: 'cached', durationMs: 0, endedAt: 1792868554579 }]
]);

/** Run 1 alone. */
export const RUN_1_ONLY: ReadonlyMap<string, AtomResult> = new Map([
  [A, { outcome: 'passed', durationMs: 1091, endedAt: 1792868444936 }],
  [B, { outcome: 'failed', durationMs: 704, endedAt: 1792868445640 }],
  [L, { outcome: 'passed', durationMs: 1088, endedAt: 1792868444933 }],
  [C, { outcome: 'passed', durationMs: 694, endedAt: 1792868445627 }]
]);
