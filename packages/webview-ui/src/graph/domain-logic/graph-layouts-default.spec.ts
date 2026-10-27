import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayouts } from './graph-layouts.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { LayoutsRig } from '../test/common/graph-layouts.type.ts';
import { GROUPED_POSITIONS_STUB, SAVED_FLAT_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { isGroupedGraph, layoutsRigOf, resultOf } from '../test/utils/graph-layouts.spec.util.ts';

const CACHED_BOTH: GraphReady = { ...STATE_STUB, folderPositions: GROUPED_POSITIONS_STUB };

describe('FEATURE: GraphLayouts default grouping', () => {
  let rig: LayoutsRig;
  let layouts: GraphLayouts;

  beforeEach(() => {
    rig = layoutsRigOf();
    layouts = new GraphLayouts(rig.deps);
  });

  describe('GIVEN a new hash', () => {
    it('WHEN it opens with no saved state THEN the folders layout runs', async () => {
      rig.setDrawn(STATE_STUB);
      void layouts.show(STATE_STUB, null);
      await rig.runs.settle(0, resultOf('h1', GROUPED_POSITIONS_STUB));

      expect(isGroupedGraph(rig.runs.graphOf(0))).toBe(true);
      expect(layouts.mode()).toBe('folders');
    });

    it('WHEN it opens with a saved grouped false THEN the flat layout draws', () => {
      rig.setDrawn(CACHED_BOTH);
      void layouts.show(CACHED_BOTH, SAVED_FLAT_STUB);

      expect(rig.runs.count()).toBe(0);
      expect(layouts.mode()).toBe('flat');
    });
  });
});
