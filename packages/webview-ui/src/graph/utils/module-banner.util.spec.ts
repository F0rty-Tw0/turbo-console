import { describe, expect, it } from 'vitest';

import { moduleBannerOf, moduleFailedTextOf, moduleStatusOf, moduleTooltipOf, modulesTitleOf } from './module-banner.util.ts';
import type { ModuleCounts, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

type PartialCase = Pick<ModulesFound, 'limit' | 'dropped'>;

const COUNTS: ModuleCounts = { unresolved: 4, external: 3, assets: 2, self: 1 };

const FOUND: ModulesFound = { ...MODULES_FOUND_STUB, counts: COUNTS };

const EMPTY: ModulesFound = { ...FOUND, files: [], tests: [], fileLinks: [], stubLinks: [] };

const FILE_LIMIT: PartialCase = { limit: 'files', dropped: 0 };

const ENTRY_LIMIT: PartialCase = { limit: 'entries', dropped: 0 };

const TIME_LIMIT: PartialCase = { limit: 'time', dropped: 0 };

const DROPPED: PartialCase = { limit: null, dropped: 7 };

const TIME_AND_DROPPED: PartialCase = { limit: 'time', dropped: 7 };

const WHOLE: PartialCase = { limit: null, dropped: 0 };

const ROWS: [PartialCase, string | null][] = [
  [FILE_LIMIT, 'Partial: the scan stopped at the file limit. Files past it are not shown, and imports of them count as unresolved.'],
  [ENTRY_LIMIT, 'Partial: the scan stopped at the entry limit. Files past it are not shown, and imports of them count as unresolved.'],
  [TIME_LIMIT, 'Partial: the scan ran out of time. Some files are shown without their imports.'],
  [DROPPED, 'Partial: 7 items were left out to keep the graph small.'],
  [
    TIME_AND_DROPPED,
    'Partial: the scan ran out of time. Some files are shown without their imports. 7 items were left out to keep the graph small.'
  ],
  [WHOLE, null]
];

describe('FEATURE: module banner texts', () => {
  describe('GIVEN web found with 6 files, 8 links summing 9 imports and 4 unresolved', () => {
    it('WHEN its status is built THEN it reads files, imports and unresolved from the payload', () => {
      expect(moduleStatusOf(FOUND)).toBe('6 files · 9 imports · 4 unresolved');
    });

    it('WHEN its tooltip is built THEN it reads external, assets and self', () => {
      expect(moduleTooltipOf(FOUND)).toBe('3 external · 2 assets · 1 self');
    });
  });

  describe('GIVEN each partial case', () => {
    it.each(ROWS)('WHEN %j is read THEN the banner is %s', (partial, text) => {
      const found: ModulesFound = { ...FOUND, ...partial };

      expect(moduleBannerOf(found)).toBe(text);
    });
  });

  describe('GIVEN a payload with no files', () => {
    it('WHEN its banner is built THEN it says no source files were found', () => {
      expect(moduleBannerOf(EMPTY)).toBe('No source files found.');
    });
  });

  describe('GIVEN the package web', () => {
    it('WHEN its failed text and title are built THEN they name web', () => {
      expect([moduleFailedTextOf('web'), modulesTitleOf('web')]).toStrictEqual(['Could not scan web.', 'Modules of web']);
    });
  });
});
