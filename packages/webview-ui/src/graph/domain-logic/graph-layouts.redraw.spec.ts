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
  readonly isOff: boolean;
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
  };

  beforeEach((): void => {
    rig = layoutsRigOf();
    layouts = new GraphLayouts(rig.deps);
  });

  it.each<RedrawRow>([
    { name: 'folders drawn, saved flat', shown: SAVED_GROUPED_STUB, saved: SAVED_FLAT_STUB, mode: 'flat', isOff: true },
    { name: 'flat drawn, saved grouped', shown: SAVED_FLAT_STUB, saved: SAVED_GROUPED_STUB, mode: 'folders', isOff: false },
    { name: 'folders drawn, saved grouped', shown: SAVED_GROUPED_STUB, saved: SAVED_GROUPED_STUB, mode: 'folders', isOff: false },
    { name: 'flat drawn, saved flat', shown: SAVED_FLAT_STUB, saved: SAVED_FLAT_STUB, mode: 'flat', isOff: false }
  ])(
    'GIVEN $name WHEN task mode is left THEN the saved mode is drawn and grouping off is reported only for folders to flat',
    async ({ shown, saved, mode, isOff }) => {
      drawn(CACHED_BOTH, shown);

      await layouts.redraw(saved);

      expect([layouts.mode(), layouts.drawnMode()]).toStrictEqual([mode, mode]);
      expect(rig.onPlaced).toHaveBeenLastCalledWith(mode);
      expect(rig.onDrawn).toHaveBeenCalledExactlyOnceWith(saved);
      expect(rig.onGroupingOff).toHaveBeenCalledTimes(isOff ? 1 : 0);
    }
  );

  it('GIVEN folders drawn WHEN redraw gets null THEN the checkbox mode stays and no grouping off is reported', async () => {
    drawn(CACHED_BOTH, SAVED_GROUPED_STUB);

    await layouts.redraw(null);

    expect([layouts.mode(), layouts.drawnMode(), rig.onGroupingOff.mock.calls.length]).toStrictEqual(['folders', 'folders', 0]);
  });

  it('GIVEN flat drawn, saved grouped and no grouped layout cached WHEN redraw runs THEN one grouped layout starts and mode() reads folders at once', () => {
    rig.setDrawn(STATE_STUB);
    void layouts.show(STATE_STUB, SAVED_FLAT_STUB);
    const before = rig.runs.count();

    void layouts.redraw(SAVED_GROUPED_STUB);

    expect([layouts.mode(), rig.runs.count() - before]).toStrictEqual(['folders', 1]);
  });

  it('GIVEN folders drawn WHEN redraw saves flat THEN grouping off is reported before the flat snapshot is placed', async () => {
    drawn(CACHED_BOTH, SAVED_GROUPED_STUB);

    await layouts.redraw(SAVED_FLAT_STUB);

    const off = rig.onGroupingOff.mock.invocationCallOrder.at(0) ?? Infinity;
    const placed = rig.onPlaced.mock.invocationCallOrder.at(0) ?? -Infinity;

    expect(off).toBeLessThan(placed);
  });
});
