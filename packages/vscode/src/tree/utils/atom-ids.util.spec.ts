import { atomGroupsOf } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { atomFileIds, atomIdsKey, packageAtomIdsKey } from './atom-ids.util.ts';
import { FILE_A, FILE_B, PKG } from '../test/common/atom-load.const.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

const BASE_GROUPS = atomGroupsOf(atomModelOf(['tests/a.spec.ts', 'tests/b fails.spec.ts']));

describe('FEATURE: atom ids key', () => {
  describe('GIVEN the same ids in another order', () => {
    it('WHEN keyed THEN the keys are equal', () => {
      const reversed = atomGroupsOf(atomModelOf(['tests/b fails.spec.ts', 'tests/a.spec.ts']));

      expect(atomIdsKey(reversed)).toBe(atomIdsKey(BASE_GROUPS));
    });
  });

  describe('GIVEN one file id renamed', () => {
    it('WHEN keyed THEN the keys differ', () => {
      const renamed = atomGroupsOf(atomModelOf(['tests/a.spec.ts', 'tests/c.spec.ts']));

      expect(atomIdsKey(renamed)).not.toBe(atomIdsKey(BASE_GROUPS));
    });
  });

  describe('GIVEN no groups', () => {
    it('WHEN keyed THEN the key is empty', () => {
      expect(atomIdsKey([])).toBe('');
    });
  });
});

describe('FEATURE: atom file ids', () => {
  describe('GIVEN a group of two files', () => {
    it('WHEN listed THEN both file task ids come back and the umbrella does not', () => {
      expect(atomFileIds(BASE_GROUPS)).toStrictEqual([FILE_A, FILE_B]);
    });
  });

  describe('GIVEN no groups', () => {
    it('WHEN listed THEN no id comes back', () => {
      expect(atomFileIds([])).toStrictEqual([]);
    });
  });
});

describe('FEATURE: package atom ids key', () => {
  describe('GIVEN the groups of package @fx/e2e', () => {
    it('WHEN keyed by that package THEN the key is the key of its groups', () => {
      expect(packageAtomIdsKey(BASE_GROUPS, PKG)).toBe(atomIdsKey(BASE_GROUPS));
    });

    it('WHEN keyed by another package THEN the key is empty', () => {
      expect(packageAtomIdsKey(BASE_GROUPS, 'a')).toBe('');
    });
  });
});
