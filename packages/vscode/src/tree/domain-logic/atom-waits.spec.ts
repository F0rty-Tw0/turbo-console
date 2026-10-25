import { atomGroupsOf } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AtomWaits } from './atom-waits.ts';
import { BASE_SPEC_PATHS, OTHER_ROOT, PKG, ROOT } from '../test/common/atom-load.const.ts';
import { ATOM_GROUP_STUB } from '../test/stubs/atom-view.stub.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

const BASE_GROUPS = atomGroupsOf(atomModelOf(BASE_SPEC_PATHS));

describe('FEATURE: atom waits', () => {
  let waits: AtomWaits;

  beforeEach(() => {
    waits = new AtomWaits();
  });

  describe('GIVEN a package waiting in a root', () => {
    beforeEach(() => {
      waits.add(ROOT, PKG);
    });

    it('WHEN its root is taken with its groups THEN it comes back', () => {
      expect(waits.takeOf(ROOT, BASE_GROUPS)).toStrictEqual([PKG]);
    });

    it('WHEN its root is taken twice THEN the second take is empty', () => {
      waits.takeOf(ROOT, BASE_GROUPS);

      expect(waits.takeOf(ROOT, BASE_GROUPS)).toStrictEqual([]);
    });

    it('WHEN its root is taken without its groups THEN nothing comes back', () => {
      expect(waits.takeOf(ROOT, [])).toStrictEqual([]);
    });

    it('WHEN another root is taken THEN nothing comes back', () => {
      expect(waits.takeOf(OTHER_ROOT, BASE_GROUPS)).toStrictEqual([]);
    });

    it('WHEN another root is taken THEN its own root still gives it back', () => {
      waits.takeOf(OTHER_ROOT, BASE_GROUPS);

      expect(waits.takeOf(ROOT, BASE_GROUPS)).toStrictEqual([PKG]);
    });

    it('WHEN its root is not kept THEN a take is empty', () => {
      waits.keep(new Set([OTHER_ROOT]));

      expect(waits.takeOf(ROOT, BASE_GROUPS)).toStrictEqual([]);
    });

    it('WHEN its root is kept THEN a take gives it back', () => {
      waits.keep(new Set([ROOT]));

      expect(waits.takeOf(ROOT, BASE_GROUPS)).toStrictEqual([PKG]);
    });

    it('WHEN cleared THEN a take is empty', () => {
      waits.clear();

      expect(waits.takeOf(ROOT, BASE_GROUPS)).toStrictEqual([]);
    });
  });

  describe('GIVEN two packages waiting in one root', () => {
    it('WHEN the root is taken with both packages grouped THEN both come back', () => {
      const groups = [...BASE_GROUPS, ATOM_GROUP_STUB];

      waits.add(ROOT, PKG);
      waits.add(ROOT, ATOM_GROUP_STUB.packageName);

      expect(waits.takeOf(ROOT, groups)).toStrictEqual([PKG, ATOM_GROUP_STUB.packageName]);
    });
  });
});
