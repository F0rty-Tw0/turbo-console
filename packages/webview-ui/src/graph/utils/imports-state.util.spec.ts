import { describe, expect, it } from 'vitest';

import { askedImportsOf, repliedImportsOf } from './imports-state.util.ts';
import type { EdgeImportsResult, ImportSite } from '../../bridge/common/graph-imports.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';

const SITE: ImportSite = {
  file: 'src/a.ts',
  line: 3,
  specifier: '@x/ui',
  text: "import '@x/ui';",
  kind: 'static',
  isType: false,
  via: 'name'
};

const SITES: ImportSite[] = [SITE];

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
  readonly expected: ImportsState;
};

type RepliedRow = {
  readonly label: string;
  readonly result: EdgeImportsResult;
  readonly expected: ImportsState;
};

const ASKED_ROWS: AskedRow[] = [
  { label: 'nothing', state: null, expected: SCANNING },
  { label: 'a failed scan', state: FAILED, expected: SCANNING },
  { label: 'a found list', state: FOUND, expected: FOUND_REFRESHING },
  { label: 'a none answer', state: NONE, expected: NONE_REFRESHING },
  { label: 'a found list already refreshing', state: FOUND_REFRESHING, expected: FOUND_REFRESHING }
];

const REPLIED_ROWS: RepliedRow[] = [
  { label: 'found', result: FOUND_RESULT, expected: FOUND },
  { label: 'none with skipped 2', result: NONE_RESULT, expected: NONE },
  { label: 'failed', result: FAILED_RESULT, expected: FAILED }
];

describe('FEATURE: imports state', () => {
  describe('GIVEN the link is asked for its imports', () => {
    it.each(ASKED_ROWS)('WHEN the state is $label THEN the next state is exact', (row) => {
      const state = askedImportsOf(row.state);

      expect(state).toStrictEqual(row.expected);
    });

    it('WHEN the state is scanning THEN the same object comes back', () => {
      const state = askedImportsOf(SCANNING);

      expect(state).toBe(SCANNING);
    });
  });

  describe('GIVEN the host replies with a result', () => {
    it.each(REPLIED_ROWS)('WHEN the result is $label THEN the state is exact', (row) => {
      const state = repliedImportsOf(row.result);

      expect(state).toStrictEqual(row.expected);
    });
  });
});
