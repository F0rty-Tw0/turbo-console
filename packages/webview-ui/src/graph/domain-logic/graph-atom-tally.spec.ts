import { beforeEach, describe, expect, it } from 'vitest';

import { GraphAtomTally } from './graph-atom-tally.ts';
import type { GraphAtomCounts } from '../../bridge/common/graph-atoms-message.type.ts';
import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import { BASE, E2E_CI, LIB_CI, SIZES } from '../test/utils/graph-atom-groups.spec.util.ts';

const SENT: GraphAtomCounts = { files: 10, cached: 3, failed: 1 };

const BOTH = new Map<string, GraphAtomGroup>([
  ['app#e2e-ci', E2E_CI],
  ['lib#e2e-ci', LIB_CI]
]);

const LIB_ONLY = new Map<string, GraphAtomGroup>([['lib#e2e-ci', LIB_CI]]);

const PLACEMENT: AtomPlacement = { shown: new Set(), base: BASE, sizes: SIZES, pkgBoxes: new Map(), links: [] };

describe('FEATURE: GraphAtomTally', () => {
  let tally: GraphAtomTally;

  beforeEach(() => {
    tally = new GraphAtomTally();
  });

  describe('GIVEN counts sent for app#e2e-ci only', () => {
    beforeEach(() => {
      tally.set('app#e2e-ci', SENT);
    });

    it('WHEN the counts of both groups are read THEN app#e2e-ci has the sent counts and lib#e2e-ci its file count', () => {
      const counts = tally.countsOf(BOTH);

      expect([...counts]).toStrictEqual([
        ['app#e2e-ci', SENT],
        ['lib#e2e-ci', { files: 2, cached: null, failed: null }]
      ]);
    });

    it('WHEN the drawn counts are read THEN only the umbrella the placement sizes is in them', () => {
      const drawn = tally.drawnOf(BOTH, PLACEMENT);

      expect([...drawn]).toStrictEqual([['app#e2e-ci', SENT]]);
    });

    it('WHEN only lib#e2e-ci is kept and app#e2e-ci comes back THEN its counts are its file count again', () => {
      tally.keep(LIB_ONLY);

      const counts = tally.countsOf(BOTH);

      expect(counts.get('app#e2e-ci')).toStrictEqual({ files: 10, cached: null, failed: null });
    });
  });
});
