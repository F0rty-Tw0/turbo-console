import { describe, expect, it } from 'vitest';

import { askedImportsOf, repliedImportsOf } from './imports-state.util.ts';
import type { EdgeImportsResult, ImportSite } from '../../bridge/common/graph-imports.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';
import { IMPORT_SITE_STUB } from '../test/stubs/graph-host-message.stub.ts';

const SITES: ImportSite[] = [IMPORT_SITE_STUB];

const SCANNING: ImportsState = { kind: 'scanning' };

const FAILED: ImportsState = { kind: 'failed' };

const FOUND: ImportsState = { kind: 'found', scanned: 4, skipped: 1, total: 1, sites: SITES, limit: null, isRefreshing: false };

const FOUND_REFRESHING: ImportsState = { ...FOUND, isRefreshing: true };

const NONE: ImportsState = { kind: 'none', scanned: 4, skipped: 2, limit: 'time', isRefreshing: false };

const NONE_REFRESHING: ImportsState = { ...NONE, isRefreshing: true };

const FOUND_RESULT: EdgeImportsResult = { kind: 'found', scanned: 4, skipped: 1, total: 1, sites: SITES, limit: null };

const NONE_RESULT: EdgeImportsResult = { kind: 'none', scanned: 4, skipped: 2, limit: 'time' };

const FAILED_RESULT: EdgeImportsResult = { kind: 'failed' };

type AskedRow = {
  readonly label: string;
  readonly state: ImportsState | null;
  readonly outcome: string;
  readonly expected: ImportsState;
};

type RepliedRow = {
  readonly label: string;
  readonly result: EdgeImportsResult;
  readonly outcome: string;
  readonly expected: ImportsState;
};

const ASKED_ROWS: AskedRow[] = [
  { label: 'nothing', state: null, outcome: 'a scan', expected: SCANNING },
  { label: 'a failed scan', state: FAILED, outcome: 'a scan', expected: SCANNING },
  { label: 'a found list', state: FOUND, outcome: 'the same list, refreshing', expected: FOUND_REFRESHING },
  { label: 'a none answer', state: NONE, outcome: 'the same answer, refreshing', expected: NONE_REFRESHING },
  {
    label: 'a found list already refreshing',
    state: FOUND_REFRESHING,
    outcome: 'the same list, still refreshing',
    expected: FOUND_REFRESHING
  }
];

const REPLIED_ROWS: RepliedRow[] = [
  { label: 'a found list', result: FOUND_RESULT, outcome: 'that list, fresh, every field kept', expected: FOUND },
  { label: 'a none answer with skipped 2', result: NONE_RESULT, outcome: 'that answer, fresh, skipped 2 kept', expected: NONE },
  { label: 'a failed scan', result: FAILED_RESULT, outcome: 'failed', expected: FAILED }
];

describe('FEATURE: imports state', () => {
  describe.each(ASKED_ROWS)('GIVEN $label is held', ({ state, outcome, expected }) => {
    it(`WHEN the link is asked THEN it becomes ${outcome}`, () => {
      const next = askedImportsOf(state);

      expect(next).toStrictEqual(expected);
    });
  });

  describe('GIVEN a scan is held', () => {
    it('WHEN the link is asked THEN the same object comes back', () => {
      const next = askedImportsOf(SCANNING);

      expect(next).toBe(SCANNING);
    });
  });

  describe.each(REPLIED_ROWS)('GIVEN a reply carrying $label', ({ result, outcome, expected }) => {
    it(`WHEN it is applied THEN the state becomes ${outcome}`, () => {
      const state = repliedImportsOf(result);

      expect(state).toStrictEqual(expected);
    });
  });
});
