import { describe, expect, it } from 'vitest';

import { importsModelOf } from './imports-model.util.ts';
import type { ImportSite } from '../../bridge/common/graph-imports.type.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { ImportsViewModel } from '../common/details-imports.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';
import { IMPORT_SITE_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { sitesOf } from '../test/utils/import-sites.spec.util.ts';

type FoundState = Extract<ImportsState, Record<'kind', 'found'>>;

type NoneState = Extract<ImportsState, Record<'kind', 'none'>>;

type LimitRow = {
  readonly label: string;
  readonly state: ImportsState;
  readonly expected: string;
};

const LINK: GraphEdge = { source: 'web', target: 'ui' };

const SCANNING: ImportsState = { kind: 'scanning' };

const FAILED: ImportsState = { kind: 'failed' };

const foundOf = (sites: ImportSite[], extra: Partial<FoundState> = {}): FoundState => {
  const state: FoundState = {
    kind: 'found',
    scanned: 3,
    skipped: 0,
    total: sites.length,
    sites,
    limit: null,
    isRefreshing: false,
    ...extra
  };

  return state;
};

const noneOf = (extra: Partial<NoneState> = {}): NoneState => {
  const state: NoneState = { kind: 'none', scanned: 3, skipped: 0, limit: null, isRefreshing: false, ...extra };

  return state;
};

const modelOf = (state: ImportsState, isOpen = false): ImportsViewModel => importsModelOf(state, LINK, isOpen);

const rowsOf = (model: ImportsViewModel): string[] => {
  const keys = model.groups.flatMap((group) => group.rows.map((row) => row.key));

  return keys;
};

const HOST_ORDER: ImportSite[] = [
  { ...IMPORT_SITE_STUB, file: 'src/b.ts', line: 0 },
  { ...IMPORT_SITE_STUB, file: 'src/a.ts', line: 3 },
  { ...IMPORT_SITE_STUB, file: 'src/a.ts', line: 9 }
];

const DYNAMIC_TYPE_SITE: ImportSite = { ...IMPORT_SITE_STUB, line: 0, kind: 'dynamic', isType: true };

const DYNAMIC_TYPE_ROWS = [{ tags: ['type', 'dynamic'], label: 'Open src/a.ts at line 1' }];

const NONE_LINE = 'No file in web imports ui (3 files scanned).';

const LIMIT_ROWS: LimitRow[] = [
  {
    label: 'found with the files limit',
    state: foundOf(sitesOf(2), { limit: 'files' }),
    expected: 'Stopped at 5,000 files; there may be more.'
  },
  {
    label: 'found with the entries limit',
    state: foundOf(sitesOf(2), { limit: 'entries' }),
    expected: 'Stopped at 50,000 folder entries; there may be more.'
  },
  {
    label: 'found with the time limit',
    state: foundOf(sitesOf(2), { limit: 'time' }),
    expected: 'Stopped after 4 s; there may be more.'
  },
  { label: 'none with the files limit', state: noneOf({ limit: 'files' }), expected: 'Stopped at 5,000 files; there may be more.' },
  {
    label: 'none with the entries limit',
    state: noneOf({ limit: 'entries' }),
    expected: 'Stopped at 50,000 folder entries; there may be more.'
  },
  { label: 'none with the time limit', state: noneOf({ limit: 'time' }), expected: 'Stopped after 4 s; there may be more.' }
];

describe('FEATURE: imports model', () => {
  describe('GIVEN the scan is running', () => {
    it('WHEN the model is built THEN it shows the looking line and no list', () => {
      const model = modelOf(SCANNING);

      expect(model).toStrictEqual({
        heading: 'Imports of ui',
        scanLabel: 'Scan web for imports of ui again',
        isScanning: true,
        status: null,
        lines: ['Looking for imports of ui in web…'],
        groups: [],
        more: null,
        notes: []
      });
    });
  });

  describe('GIVEN a found list in host order', () => {
    it('WHEN the model is built THEN the heading counts the total', () => {
      const model = modelOf(foundOf(HOST_ORDER));

      expect(model.heading).toBe('Imports of ui (3)');
    });

    it('WHEN the model is built THEN the groups keep the host order', () => {
      const model = modelOf(foundOf(HOST_ORDER));

      const files = model.groups.map((group) => group.file);

      expect(files).toStrictEqual(['src/b.ts', 'src/a.ts']);
    });

    it('WHEN the model is built THEN a key is the file and its 0-based line', () => {
      const model = modelOf(foundOf(HOST_ORDER));

      expect(rowsOf(model)).toStrictEqual(['src/b.ts:0', 'src/a.ts:3', 'src/a.ts:9']);
    });

    it('WHEN the model is built THEN a number is the line counted from 1', () => {
      const model = modelOf(foundOf(HOST_ORDER));

      const numbers = model.groups[1]?.rows.map((row) => row.number);

      expect(numbers).toStrictEqual(['4', '10']);
    });

    it('WHEN the model is built THEN it is not scanning and has no lines', () => {
      const model = modelOf(foundOf(HOST_ORDER));

      expect([model.isScanning, model.lines]).toStrictEqual([false, []]);
    });

    it('WHEN it is asked for again THEN it keeps the groups and reads Scanning again', () => {
      const model = modelOf(foundOf(HOST_ORDER, { isRefreshing: true }));

      expect([model.isScanning, model.lines, rowsOf(model).length]).toStrictEqual([true, ['Scanning again…'], 3]);
    });

    it('WHEN a row is a dynamic type import THEN it carries its tags and an Open label', () => {
      const model = modelOf(foundOf([DYNAMIC_TYPE_SITE]));

      expect(model.groups).toMatchObject([{ rows: DYNAMIC_TYPE_ROWS }]);
    });
  });

  describe('GIVEN a found list past the fold', () => {
    it('WHEN 25 sites are folded THEN 20 rows show with Show 5 more', () => {
      const model = modelOf(foundOf(sitesOf(25)));

      expect([rowsOf(model).length, model.more]).toStrictEqual([20, 'Show 5 more']);
    });

    it('WHEN 25 sites are open THEN all 25 rows show and the button is gone', () => {
      const model = modelOf(foundOf(sitesOf(25)), true);

      expect([rowsOf(model).length, model.more]).toStrictEqual([25, null]);
    });

    it('WHEN exactly 20 sites are folded THEN 20 rows show and the button is gone', () => {
      const model = modelOf(foundOf(sitesOf(20)));

      expect([rowsOf(model).length, model.more]).toStrictEqual([20, null]);
    });
  });

  describe('GIVEN the host cut the list', () => {
    it('WHEN 200 of 250 sites arrive THEN the first note says so and the heading counts 250', () => {
      const model = modelOf(foundOf(sitesOf(200), { total: 250 }), true);

      expect([model.heading, model.notes[0]]).toStrictEqual(['Imports of ui (250)', 'Showing 200 of 250 imports.']);
    });

    it('WHEN all 3 sites arrive THEN there is no showing note', () => {
      const model = modelOf(foundOf(sitesOf(3)));

      expect(model.notes).toStrictEqual([]);
    });

    it('WHEN the list is cut, files were skipped and the time limit hit THEN the notes read showing, skipped, limit', () => {
      const state = foundOf(sitesOf(2), { total: 5, skipped: 1, limit: 'time' });

      const model = modelOf(state);

      expect(model.notes).toStrictEqual([
        'Showing 2 of 5 imports.',
        'Scanned 3 files, skipped 1 (over 1 MiB, unreadable or path too long).',
        'Stopped after 4 s; there may be more.'
      ]);
    });

    it.each(LIMIT_ROWS)('WHEN it is $label THEN the limit text is the last note', ({ state, expected }) => {
      const model = modelOf(state);

      expect(model.notes.at(-1)).toBe(expected);
    });
  });

  describe('GIVEN no file imports the target', () => {
    it('WHEN nothing was skipped THEN the status is No imports found with the none line', () => {
      const model = modelOf(noneOf());

      expect([model.status, model.lines, model.notes]).toStrictEqual([{ icon: 'info', word: 'No imports found' }, [NONE_LINE], []]);
    });

    it('WHEN 2 files were skipped THEN the status says none in scanned files and a note counts them', () => {
      const model = modelOf(noneOf({ skipped: 2 }));

      expect([model.status?.word, model.notes]).toStrictEqual([
        'None found in scanned files',
        ['Scanned 3 files, skipped 2 (over 1 MiB, unreadable or path too long).']
      ]);
    });

    it('WHEN it is asked for again THEN Scanning again comes first and the status stays', () => {
      const model = modelOf(noneOf({ isRefreshing: true }));

      expect([model.lines, model.status?.word]).toStrictEqual([['Scanning again…', NONE_LINE], 'No imports found']);
    });
  });

  describe('GIVEN the scan failed', () => {
    it('WHEN the model is built THEN it shows the warning status and the failed line', () => {
      const model = modelOf(FAILED);

      expect([model.status, model.lines, model.isScanning]).toStrictEqual([
        { icon: 'warning', word: "Couldn't scan" },
        ["Couldn't read the files of web."],
        false
      ]);
    });
  });
});
