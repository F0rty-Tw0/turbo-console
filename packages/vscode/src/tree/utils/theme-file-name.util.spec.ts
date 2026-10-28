import { describe, expect, it } from 'vitest';

import { themeFileNameOf } from './theme-file-name.util.ts';
import type { IconsState, TreeRow } from '../common/tree-row.type.ts';
import { TREE_ROW_STUB } from '../test/stubs/tree-row.stub.ts';

const NAMES = new Set(['vitest.config.js']);

const rowOf = (themeFiles: string[]): TreeRow => {
  const row: TreeRow = { ...TREE_ROW_STUB, themeFiles };

  return row;
};

const THEME: IconsState = { mode: 'theme', fileNames: NAMES };

describe('FEATURE: the theme file name of a row', () => {
  describe('GIVEN theme mode', () => {
    it('WHEN the theme names the second config file only THEN that name', () => {
      const row = rowOf(['vitest.config.ts', 'vitest.config.js']);

      const name = themeFileNameOf(row, THEME);

      expect(name).toBe('vitest.config.js');
    });

    it('WHEN the theme names both THEN the first by priority', () => {
      const row = rowOf(['vitest.config.ts', 'vitest.config.js']);
      const both: IconsState = { mode: 'theme', fileNames: new Set(['vitest.config.js', 'vitest.config.ts']) };

      const name = themeFileNameOf(row, both);

      expect(name).toBe('vitest.config.ts');
    });

    it('WHEN the theme names none THEN null', () => {
      const name = themeFileNameOf(rowOf(['angular.json']), THEME);

      expect(name).toBeNull();
    });

    it('WHEN the row has no themeFiles THEN null', () => {
      const name = themeFileNameOf(TREE_ROW_STUB, THEME);

      expect(name).toBeNull();
    });
  });

  describe('GIVEN builtin mode', () => {
    it('WHEN the names would match THEN null', () => {
      const builtin: IconsState = { mode: 'builtin', fileNames: NAMES };

      const name = themeFileNameOf(rowOf(['vitest.config.js']), builtin);

      expect(name).toBeNull();
    });
  });
});
