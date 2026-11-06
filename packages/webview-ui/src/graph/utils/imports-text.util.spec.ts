import { describe, expect, it } from 'vitest';

import {
  failedTextOf,
  importsHeadingOf,
  lookingTextOf,
  noneTextOf,
  openImportLabelOf,
  scanAgainLabelOf,
  showMoreTextOf,
  showingTextOf,
  skippedTextOf,
  tagsOf
} from './imports-text.util.ts';
import type { ImportSite } from '../../bridge/common/graph-imports.type.ts';
import { IMPORT_SITE_STUB } from '../test/stubs/graph-host-message.stub.ts';

type TagsRow = {
  readonly label: string;
  readonly site: ImportSite;
  readonly expected: string[];
};

const TYPE_SITE: ImportSite = { ...IMPORT_SITE_STUB, isType: true };

const REEXPORT_SITE: ImportSite = { ...IMPORT_SITE_STUB, kind: 'reexport', via: 'relative' };

const DYNAMIC_TYPE_SITE: ImportSite = { ...IMPORT_SITE_STUB, kind: 'dynamic', isType: true, via: 'alias' };

const REQUIRE_SITE: ImportSite = { ...IMPORT_SITE_STUB, kind: 'require' };

const TAGS_ROWS: TagsRow[] = [
  { label: 'a static import by name', site: IMPORT_SITE_STUB, expected: [] },
  { label: 'a type import by name', site: TYPE_SITE, expected: ['type'] },
  { label: 'a re-export by relative path', site: REEXPORT_SITE, expected: ['re-export', 'relative path'] },
  { label: 'a dynamic type import by alias', site: DYNAMIC_TYPE_SITE, expected: ['type', 'dynamic', 'alias'] },
  { label: 'a require by name', site: REQUIRE_SITE, expected: ['require'] }
];

describe('FEATURE: imports text', () => {
  describe('GIVEN the heading', () => {
    it.each([
      [null, 'Imports of ui'],
      [3, 'Imports of ui (3)']
    ])('WHEN the count is %j THEN it reads %s', (count, expected) => {
      const heading = importsHeadingOf('ui', count);

      expect(heading).toBe(expected);
    });
  });

  describe('GIVEN the link web to ui', () => {
    it('WHEN the Scan again button is labelled THEN it names both packages', () => {
      const label = scanAgainLabelOf('web', 'ui');

      expect(label).toBe('Scan web for imports of ui again');
    });

    it('WHEN the scan runs THEN the looking line names both packages', () => {
      const text = lookingTextOf('web', 'ui');

      expect(text).toBe('Looking for imports of ui in web…');
    });

    it.each([
      [3, 'No file in web imports ui (3 files scanned).'],
      [1, 'No file in web imports ui (1 file scanned).']
    ])('WHEN %i files were scanned and none imports THEN the line reads %s', (scanned, expected) => {
      const text = noneTextOf('web', 'ui', scanned);

      expect(text).toBe(expected);
    });

    it('WHEN the scan failed THEN the line names the dependent', () => {
      const text = failedTextOf('web');

      expect(text).toBe("Couldn't read the files of web.");
    });
  });

  describe('GIVEN an import row', () => {
    it('WHEN its 0-based line 3 is labelled THEN the label counts from 1', () => {
      const label = openImportLabelOf('src/a.ts', 3);

      expect(label).toBe('Open src/a.ts at line 4');
    });

    it.each(TAGS_ROWS)('WHEN it is $label THEN its tags are in the order type, kind, via', ({ site, expected }) => {
      const tags = tagsOf(site);

      expect(tags).toStrictEqual(expected);
    });
  });

  describe('GIVEN a long list', () => {
    it('WHEN 5 rows are folded THEN the button reads Show 5 more', () => {
      const text = showMoreTextOf(5);

      expect(text).toBe('Show 5 more');
    });

    it('WHEN 200 of 250 imports are shown THEN the note says so', () => {
      const text = showingTextOf(200, 250);

      expect(text).toBe('Showing 200 of 250 imports.');
    });

    it.each([
      [10, 1, 'Scanned 10 files, skipped 1 (over 1 MiB, unreadable or path too long).'],
      [1, 2, 'Scanned 1 file, skipped 2 (over 1 MiB, unreadable or path too long).']
    ])('WHEN %i files were scanned and %i skipped THEN the note reads %s', (scanned, skipped, expected) => {
      const text = skippedTextOf(scanned, skipped);

      expect(text).toBe(expected);
    });
  });
});
