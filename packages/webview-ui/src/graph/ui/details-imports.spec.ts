import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { importsView } from './details-imports.ts';
import type { ImportSite } from '../../bridge/common/graph-imports.type.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { ImportsViewModel } from '../common/details-imports.type.ts';
import type { ImportsDetails } from '../common/details-view.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { IMPORT_SITE_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { childrenOf, textOf, textsWith, withClass, withClassIn } from '../test/utils/class-elements.spec.util.ts';
import { foundOf, noneOf, sitesOf } from '../test/utils/import-sites.spec.util.ts';
import { blockOrderOf, rowTextsWith, statusAndLinesOf } from '../test/utils/imports-view.spec.util.ts';
import { importsModelOf } from '../utils/imports-model.util.ts';

type Built = {
  readonly model: ImportsViewModel;
  readonly view: ImportsDetails;
};

const LINK: GraphEdge = { source: 'web', target: 'ui' };

const SCANNING: ImportsState = { kind: 'scanning' };

const FAILED: ImportsState = { kind: 'failed' };

const TAGGED_SITE: ImportSite = { ...IMPORT_SITE_STUB, line: 0, kind: 'dynamic', isType: true };

const PLAIN_SITE: ImportSite = { ...IMPORT_SITE_STUB, line: 1 };

const B_SITES = sitesOf(2, 'src/b.ts');

const FOLDED_A_SITES = sitesOf(13);

const FOLDED_B_SITES = sitesOf(12, 'src/b.ts');

const FOLDED_SITES: ImportSite[] = [...FOLDED_A_SITES, ...FOLDED_B_SITES];

const rowNumbersOf = (count: number): string[] => Array.from({ length: count }, (_blank, index): string => `row ${index + 1}`);

const TWO_FILES: ImportSite[] = [IMPORT_SITE_STUB, ...B_SITES];

const builtFrom = (state: ImportsState): Built => {
  const model = importsModelOf(state, LINK, false);
  const view = importsView(model);
  const built: Built = { model, view };

  return built;
};

describe('FEATURE: importsView', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a scanning model', () => {
    it('WHEN built THEN the h3 reads "Imports of ui" in the header', () => {
      const { view } = builtFrom(SCANNING);
      const header = childrenOf(view.root, 'details-imports-header');

      expect(header.map(textOf).slice(0, 1)).toStrictEqual(['Imports of ui']);
      expect(header[0]?.tagName).toBe('H3');
    });

    it('WHEN built THEN no row and no Show more is drawn', () => {
      const { view } = builtFrom(SCANNING);

      expect(view.rows).toStrictEqual([]);
      expect(view.more).toBeNull();
    });

    it('WHEN built THEN Scan again is named, titled and aria-disabled, never disabled', () => {
      const { view } = builtFrom(SCANNING);

      expect(view.scanAgain.getAttribute('aria-label')).toBe('Scan web for imports of ui again');
      expect(view.scanAgain.title).toBe('Scan the files again');
      expect(view.scanAgain.getAttribute('aria-disabled')).toBe('true');
      expect(view.scanAgain.disabled).toBe(false);
    });

    it('WHEN built THEN Scan again follows the h3 in the header', () => {
      const { view } = builtFrom(SCANNING);
      const header = childrenOf(view.root, 'details-imports-header');

      expect(header[1]).toBe(view.scanAgain);
    });
  });

  describe('GIVEN a found model of 3 sites in 2 files', () => {
    it('WHEN built THEN each file is an h4.details-file holding its path', () => {
      const { view } = builtFrom(foundOf(TWO_FILES));
      const headings = withClass(view.root, 'details-file');
      const files = withClassIn(view.root, 'details-file', 'details-code');

      expect(headings.map((heading) => heading.tagName)).toStrictEqual(['H4', 'H4']);
      expect(files.map(textOf)).toStrictEqual(['src/a.ts', 'src/b.ts']);
    });

    it('WHEN built THEN each row is a button whose aria-label and title are its label', () => {
      const { view } = builtFrom(foundOf(TWO_FILES));
      const labels = view.rows.map((row) => row.site.label);
      const ariaLabels = view.rows.map((row) => row.button.getAttribute('aria-label'));
      const titles = view.rows.map((row) => row.button.title);

      expect(view.rows).toHaveLength(3);
      expect(ariaLabels).toStrictEqual(labels);
      expect(titles).toStrictEqual(labels);
    });

    it('WHEN built THEN each row accessible name ends with the import text it shows', () => {
      const { view } = builtFrom(foundOf(TWO_FILES));
      const ariaLabels = view.rows.map((row) => row.button.getAttribute('aria-label'));

      expect(rowTextsWith(view, 'import-text')).toStrictEqual([["import 'core';"], ["import 'core';"], ["import 'core';"]]);
      expect(ariaLabels).toStrictEqual([
        "Open src/a.ts at line 4: import 'core';",
        "Open src/b.ts at line 1: import 'core';",
        "Open src/b.ts at line 2: import 'core';"
      ]);
    });

    it('WHEN built THEN each row shows its line number as a reader counts it', () => {
      const { view } = builtFrom(foundOf(TWO_FILES));

      expect(rowTextsWith(view, 'excerpt-number')).toStrictEqual([['4'], ['1'], ['2']]);
    });

    it('WHEN built THEN the rows carry the model keys in order', () => {
      const { model, view } = builtFrom(foundOf(TWO_FILES));
      const modelKeys = model.groups.flatMap((group) => group.rows.map((row) => row.key));
      const keys = view.rows.map((row) => row.site.key);

      expect(keys).toStrictEqual(['src/a.ts:3', 'src/b.ts:0', 'src/b.ts:1']);
      expect(keys).toStrictEqual(modelKeys);
    });

    it('WHEN built THEN no p.details-status is drawn', () => {
      const { view } = builtFrom(foundOf(TWO_FILES));

      expect(withClass(view.root, 'details-status')).toStrictEqual([]);
    });

    it('WHEN built and not refreshing THEN Scan again has no aria-disabled', () => {
      const { view } = builtFrom(foundOf(TWO_FILES));

      expect(view.scanAgain.getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('GIVEN a failed model', () => {
    it('WHEN built THEN a p.details-status holds the warning icon and the word "Couldn\'t scan"', () => {
      const { view } = builtFrom(FAILED);
      const statuses = withClass(view.root, 'details-status');
      const icons = withClassIn(view.root, 'details-status', 'icon-warning');

      expect(statuses.map((status) => status.tagName)).toStrictEqual(['P']);
      expect(icons).toHaveLength(1);
      expect(textsWith(view.root, 'details-status-word')).toStrictEqual(["Couldn't scan"]);
    });
  });

  describe('GIVEN a none model', () => {
    it('WHEN built THEN the info status and the p.details-line read the none text', () => {
      const { view } = builtFrom(noneOf());
      const icons = withClassIn(view.root, 'details-status', 'icon-info');

      expect(icons).toHaveLength(1);
      expect(textsWith(view.root, 'details-line')).toStrictEqual(['No file in web imports ui (3 files scanned).']);
    });

    it('WHEN built THEN the status comes before the lines', () => {
      const { view } = builtFrom(noneOf());

      expect(statusAndLinesOf(view)).toStrictEqual(['status', 'line']);
    });
  });

  describe('GIVEN a found model of 25 sites with the fold closed', () => {
    it('WHEN built THEN 20 rows show', () => {
      const { view } = builtFrom(foundOf(sitesOf(25)));

      expect(view.rows).toHaveLength(20);
    });

    it('WHEN built THEN Show more reads "Show 5 more" and carries the same title', () => {
      const { view } = builtFrom(foundOf(sitesOf(25)));

      expect(view.more?.textContent).toBe('Show 5 more');
      expect(view.more?.title).toBe('Show 5 more');
    });

    it('WHEN the 25 sites of 30 sit in two files THEN the block runs h4, rows, h4, rows, Show more, notes', () => {
      const { view } = builtFrom(foundOf(FOLDED_SITES, { total: 30 }));
      const aRows = rowNumbersOf(13);
      const bRows = rowNumbersOf(7);
      const expected = ['h4 src/a.ts', ...aRows, 'h4 src/b.ts', ...bRows, 'more', 'note'];

      expect(blockOrderOf(view)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a found model of 200 sites out of 250, 1 skipped and the time limit', () => {
    it('WHEN built THEN the p.details-muted texts equal the model notes in order', () => {
      const state = foundOf(sitesOf(200), { total: 250, skipped: 1, limit: 'time' });
      const { model, view } = builtFrom(state);

      expect(model.notes).toHaveLength(3);
      expect(textsWith(view.root, 'details-muted')).toStrictEqual(model.notes);
    });
  });

  describe('GIVEN a tagged row and an untagged row', () => {
    it('WHEN built THEN the tagged row lists its span.import-tag texts in order', () => {
      const { view } = builtFrom(foundOf([TAGGED_SITE, PLAIN_SITE]));

      expect(rowTextsWith(view, 'import-tag')).toStrictEqual([['type', 'dynamic'], []]);
    });

    it('WHEN built THEN only the tagged row has an .import-tags child', () => {
      const { view } = builtFrom(foundOf([TAGGED_SITE, PLAIN_SITE]));
      const holders = view.rows.map((row) => withClass(row.button, 'import-tags').length);

      expect(holders).toStrictEqual([1, 0]);
    });
  });
});
