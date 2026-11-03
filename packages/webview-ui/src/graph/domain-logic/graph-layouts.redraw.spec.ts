import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayouts } from './graph-layouts.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { LayoutsRig } from '../test/common/graph-layouts.type.ts';
import { GROUPED_POSITIONS_STUB, SAVED_FLAT_STUB, SAVED_GROUPED_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { layoutsRigOf } from '../test/utils/graph-layouts.spec.util.ts';

type RedrawRow = {
  readonly name: string;
  readonly shown: GraphViewState;
  readonly saved: GraphViewState;
  readonly mode: LayoutGrouping;
  readonly offCount: number;
};

const CACHED_BOTH: GraphReady = { ...STATE_STUB, folderPositions: GROUPED_POSITIONS_STUB };

describe('FEATURE: GraphLayouts redraw', () => {
  let rig: LayoutsRig;
  let layouts: GraphLayouts;

  const drawn = (state: GraphReady, saved: GraphViewState): void => {
    rig.setDrawn(state);
    void layouts.show(state, saved);
    rig.onPlaced.mockClear();
    rig.onDrawn.mockClear();
    rig.onGroupingOff.mockClear();
    rig.screen.showLoading.mockClear();
  };

  beforeEach((): void => {
    rig = layoutsRigOf();
    layouts = new GraphLayouts(rig.deps);
  });

  describe.each<RedrawRow>([
    { name: 'folders drawn, saved flat', shown: SAVED_GROUPED_STUB, saved: SAVED_FLAT_STUB, mode: 'flat', offCount: 1 },
    { name: 'flat drawn, saved grouped', shown: SAVED_FLAT_STUB, saved: SAVED_GROUPED_STUB, mode: 'folders', offCount: 0 },
    { name: 'folders drawn, saved grouped', shown: SAVED_GROUPED_STUB, saved: SAVED_GROUPED_STUB, mode: 'folders', offCount: 0 },
    { name: 'flat drawn, saved flat', shown: SAVED_FLAT_STUB, saved: SAVED_FLAT_STUB, mode: 'flat', offCount: 0 }
  ])('GIVEN both layouts cached, $name', ({ shown, saved, mode, offCount }) => {
    describe('WHEN task mode is left', () => {
      beforeEach(async (): Promise<void> => {
        drawn(CACHED_BOTH, shown);
        await layouts.redraw(saved);
      });

      it('THEN the checkbox mode and the mode on screen are the saved mode', () => {
        expect([layouts.mode(), layouts.drawnMode()]).toStrictEqual([mode, mode]);
      });

      it('THEN the saved mode is placed', () => {
        expect(rig.onPlaced).toHaveBeenLastCalledWith(mode);
      });

      it('THEN the draw restores the saved view once', () => {
        expect(rig.onDrawn).toHaveBeenCalledExactlyOnceWith(saved);
      });

      it('THEN grouping off is reported only for folders to flat', () => {
        expect(rig.onGroupingOff).toHaveBeenCalledTimes(offCount);
      });

      it('THEN no Loading screen shows', () => {
        expect(rig.screen.showLoading).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN folders drawn with both layouts cached', () => {
    beforeEach((): void => {
      drawn(CACHED_BOTH, SAVED_GROUPED_STUB);
    });

    it('WHEN redraw gets null THEN the checkbox mode stays and no grouping off is reported', async () => {
      await layouts.redraw(null);

      expect([layouts.mode(), layouts.drawnMode(), rig.onGroupingOff.mock.calls.length]).toStrictEqual(['folders', 'folders', 0]);
    });

    it('WHEN redraw saves flat THEN grouping off is reported before the flat snapshot is placed', async () => {
      await layouts.redraw(SAVED_FLAT_STUB);

      const off = rig.onGroupingOff.mock.invocationCallOrder.at(0) ?? Infinity;
      const placed = rig.onPlaced.mock.invocationCallOrder.at(0) ?? -Infinity;

      expect(off).toBeLessThan(placed);
    });
  });

  describe('GIVEN flat drawn and no grouped layout cached', () => {
    beforeEach((): void => {
      drawn(STATE_STUB, SAVED_FLAT_STUB);
    });

    describe('WHEN redraw saves grouped', () => {
      let before: number;

      beforeEach((): void => {
        before = rig.runs.count();
        void layouts.redraw(SAVED_GROUPED_STUB);
      });

      it('THEN mode() reads folders at once', () => {
        expect(layouts.mode()).toBe('folders');
      });

      it('THEN one grouped layout starts', () => {
        expect(rig.runs.count() - before).toBe(1);
      });

      it('THEN the Loading screen shows while it lays out', () => {
        expect(rig.screen.showLoading).toHaveBeenCalledOnce();
      });
    });
  });
});
