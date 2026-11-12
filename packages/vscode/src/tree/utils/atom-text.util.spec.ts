import type { AtomResult } from '@turbo-console/core';
import type { GraphAtomCounts } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { umbrellaCounts, umbrellaCountsOf } from './atom-text.util.ts';
import type { AtomCache, AtomView } from '../common/atom-view.type.ts';
import { ATOM_GROUP_STUB, ATOM_VIEW_STUB, A_FILE_STUB, LIVE_FILE_STUB, SPACED_FILE_STUB } from '../test/stubs/atom-view.stub.ts';

const A_ID = A_FILE_STUB.task.id;
const B_ID = SPACED_FILE_STUB.task.id;
const LIVE_ID = LIVE_FILE_STUB.task.id;

const PASSED: AtomResult = { outcome: 'passed', durationMs: 4200, endedAt: 1_700_000_000_000 };
const FAILED: AtomResult = { outcome: 'failed', durationMs: 7900, endedAt: 1_700_000_000_000 };
const CACHED: AtomResult = { outcome: 'cached', durationMs: 0, endedAt: 1_700_000_000_000 };

const dryRunOf = (a: AtomCache, b: AtomCache, live: AtomCache): ReadonlyMap<string, AtomCache> => {
  const states: [string, AtomCache][] = [
    [A_ID, a],
    [B_ID, b],
    [LIVE_ID, live]
  ];

  return new Map(states);
};

const resultsOf = (a: AtomResult, b: AtomResult, live: AtomResult): ReadonlyMap<string, AtomResult> => {
  const results: [string, AtomResult][] = [
    [A_ID, a],
    [B_ID, b],
    [LIVE_ID, live]
  ];

  return new Map(results);
};

const BOTH_SETTLED: Partial<AtomView> = { dryRun: dryRunOf('HIT', 'MISS', 'HIT'), results: resultsOf(PASSED, FAILED, PASSED) };

const ROWS: [string, Partial<AtomView>, GraphAtomCounts, string][] = [
  ['nothing settled', {}, { files: 3, cached: null, failed: null }, '3 files'],
  ['one HIT', { dryRun: dryRunOf('HIT', 'MISS', 'MISS') }, { files: 3, cached: 1, failed: null }, '3 files · 1 cached'],
  ['deferred and a HIT', { dryRun: dryRunOf('deferred', 'HIT', 'MISS') }, { files: 3, cached: 1, failed: null }, '3 files · 1 cached'],
  ['no HIT', { dryRun: dryRunOf('MISS', 'MISS', 'deferred') }, { files: 3, cached: 0, failed: null }, '3 files · 0 cached'],
  [
    'one failed, no dry run',
    { results: resultsOf(PASSED, FAILED, PASSED) },
    { files: 3, cached: null, failed: 1 },
    '3 files · 1 failed'
  ],
  ['results settled, none failed', { results: resultsOf(PASSED, CACHED, PASSED) }, { files: 3, cached: null, failed: 0 }, '3 files'],
  ['both settled', BOTH_SETTLED, { files: 3, cached: 2, failed: 1 }, '3 files · 2 cached · 1 failed']
];

describe('FEATURE: umbrella counts', () => {
  it.each(ROWS)('GIVEN %s WHEN the umbrella counts are read THEN numbers and text both match', (_label, change, counts, text) => {
    const view: AtomView = { ...ATOM_VIEW_STUB, ...change };

    expect(umbrellaCountsOf(ATOM_GROUP_STUB, view)).toStrictEqual(counts);
    expect(umbrellaCounts(ATOM_GROUP_STUB, view)).toBe(text);
  });
});
