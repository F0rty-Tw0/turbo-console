import { describe, expect, it } from 'vitest';

import { staticAtomLookup } from './static-atoms.util.ts';
import { NO_ATOMS } from '../common/atom.const.ts';
import { ATOM_MODEL_STUB } from '../test/stubs/atom-view.stub.ts';

describe('FEATURE: static atom lookup', () => {
  describe('GIVEN a model holding the group of package e2e', () => {
    const lookup = staticAtomLookup(() => ATOM_MODEL_STUB);

    it('WHEN the package is read twice THEN the same view comes back', () => {
      expect(lookup('/ws', 'e2e')).toBe(lookup('/ws', 'e2e'));
    });

    it('WHEN the package is read THEN its group lists three files and nothing is loaded', () => {
      const view = lookup('/ws', 'e2e');

      expect(view.groups[0]?.files).toHaveLength(3);
      expect(view.dryRun).toBeNull();
      expect(view.results).toBeNull();
    });

    it('WHEN a package without groups is read THEN no groups come back', () => {
      expect(lookup('/ws', 'build-only').groups).toStrictEqual([]);
    });
  });

  describe('GIVEN a root whose model is not loaded', () => {
    it('WHEN a package is read THEN it has no groups', () => {
      const lookup = staticAtomLookup(() => null);

      expect(lookup('/ws', 'e2e')).toBe(NO_ATOMS);
    });
  });
});
