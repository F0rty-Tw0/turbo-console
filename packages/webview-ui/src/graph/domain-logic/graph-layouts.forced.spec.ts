import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphLayouts } from './graph-layouts.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { LayoutRunner } from '../common/layout.type.ts';
import type { LayoutsRig } from '../test/common/graph-layouts.type.ts';
import { STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { layoutsRigOf } from '../test/utils/graph-layouts.spec.util.ts';

const UNCACHED: GraphReady = { ...STATE_STUB, positions: null };

describe('FEATURE: GraphLayouts forced runs', () => {
  let rig: LayoutsRig;
  let layouts: GraphLayouts;
  let run: MockInstance<LayoutRunner['run']>;

  beforeEach((): void => {
    rig = layoutsRigOf();
    run = vi.spyOn(rig.runs.runner, 'run');
    layouts = new GraphLayouts(rig.deps);
    rig.setDrawn(UNCACHED);
  });

  describe('GIVEN a hash shown without a cached layout', () => {
    beforeEach((): void => {
      void layouts.show(UNCACHED, null);
    });

    it('THEN its first run is not forced', () => {
      expect(run).toHaveBeenLastCalledWith(UNCACHED.hash, expect.anything(), false);
    });

    it('WHEN Re-layout or Retry is asked THEN its run is forced', () => {
      void layouts.relayout();

      expect(run).toHaveBeenLastCalledWith(UNCACHED.hash, expect.anything(), true);
    });
  });
});
