import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayouts } from './graph-layouts.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { LayoutsRig } from '../test/common/graph-layouts.type.ts';
import { GROUPED_POSITIONS_STUB, SAVED_GROUPED_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { layoutsRigOf } from '../test/utils/graph-layouts.spec.util.ts';

const CACHED_BOTH: GraphReady = { ...STATE_STUB, folderPositions: GROUPED_POSITIONS_STUB };

describe('FEATURE: GraphLayouts grouping off', () => {
  let rig: LayoutsRig;
  let layouts: GraphLayouts;

  beforeEach(() => {
    rig = layoutsRigOf();
    layouts = new GraphLayouts(rig.deps);
  });

  describe('GIVEN both layouts cached and folders drawn', () => {
    beforeEach(() => {
      rig.setDrawn(CACHED_BOTH);
      void layouts.show(CACHED_BOTH, SAVED_GROUPED_STUB);
    });

    it('WHEN the reader switches to flat THEN the grouping off is reported once', () => {
      void layouts.switchTo('flat');

      expect(rig.onGroupingOff).toHaveBeenCalledOnce();
    });

    it('WHEN the reader switches to grouped again THEN no grouping off is reported', () => {
      void layouts.switchTo('folders');

      expect(rig.onGroupingOff).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN no graph drawn yet', () => {
    it('WHEN the reader switches to flat THEN no grouping off is reported', () => {
      void layouts.switchTo('flat');

      expect(rig.onGroupingOff).not.toHaveBeenCalled();
    });
  });
});
