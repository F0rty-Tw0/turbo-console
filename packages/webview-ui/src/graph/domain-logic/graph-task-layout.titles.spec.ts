import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer, ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import { FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { ROOT_BUILD_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const POSITIONS: Positions = { 'api#build': API_AT };

const SHOWN = new Set(['api#build']);

const NO_SIZES: ReadonlyMap<string, NodeSize> = new Map();

const REQUEST: TaskLayoutRequest = { tasks: TASK_CHAIN_STUB, shown: SHOWN, key: 'k0', sizes: NO_SIZES };

const MEASURE_FAILED = new Error('cannot measure');

const TITLE_SIZE: NodeSize = { width: 150, height: 20 };

const TITLES = new Map([['api', 127]]);

const firstCompoundOf = (graph: ElkNode): ElkNode | undefined => graph.children?.[0];

const titleSizeOf = (): NodeSize => TITLE_SIZE;

const throwMeasure = (): never => {
  throw MEASURE_FAILED;
};

describe('FEATURE: GraphTaskLayout box titles', () => {
  let rig: TaskModeRig;

  const layoutWith = (textSizeOf: NodeSizer, rootLabel: string | null = null): GraphTaskLayout => {
    const deps = {
      ...rig.deps,
      textSizeOf,
      saved: (): null => null,
      rootLabel: (): string | null => rootLabel,
      onPlaced: vi.fn(),
      onDrawn: vi.fn()
    };

    return new GraphTaskLayout(deps);
  };

  /** Shows `REQUEST` and lands it as the latest run. */
  const land = async (layout: GraphTaskLayout): Promise<void> => {
    const shown = layout.show(REQUEST);

    await rig.runs.settle(rig.runs.count() - 1, resultOf(REQUEST.key, POSITIONS));
    await shown;
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
  });

  describe('GIVEN a 150 px text sizer', () => {
    let textSizeOf: Mock<NodeSizer>;
    let layout: GraphTaskLayout;

    beforeEach(() => {
      textSizeOf = vi.fn<NodeSizer>(titleSizeOf);
      layout = layoutWith(textSizeOf);
    });

    describe('WHEN a layout lands', () => {
      beforeEach(async () => {
        await land(layout);
      });

      it('THEN ELK asks each box for its 127 px title plus padding', () => {
        const compound = firstCompoundOf(rig.runs.graphOf(0));

        expect(compound?.layoutOptions?.['elk.nodeSize.minimum']).toBe(`(0, ${127 + 2 * FOLDER_PADDING_PX})`);
      });

      it('THEN the canvas draws each box with its 127 px title width', () => {
        expect(rig.view.tasks.show).toHaveBeenCalledWith(expect.objectContaining({ titleWidths: TITLES }));
      });

      it('THEN only the package with a shown task is measured', () => {
        expect(textSizeOf.mock.calls).toStrictEqual([['api']]);
      });
    });

    it('WHEN the key is shown again from memory THEN the canvas draws it with the same title widths', async () => {
      await land(layout);
      rig.view.tasks.show.mockClear();

      await layout.show(REQUEST);

      expect(rig.view.tasks.show).toHaveBeenCalledWith(expect.objectContaining({ titleWidths: TITLES }));
    });
  });

  describe('GIVEN a root task shown under the label single-app', () => {
    const rootRequest: TaskLayoutRequest = { ...REQUEST, tasks: [ROOT_BUILD_STUB], shown: new Set(['//#build']) };
    let textSizeOf: Mock<NodeSizer>;
    let layout: GraphTaskLayout;

    beforeEach(async () => {
      textSizeOf = vi.fn<NodeSizer>(titleSizeOf);
      layout = layoutWith(textSizeOf, 'single-app');

      const shown = layout.show(rootRequest);

      await rig.runs.settle(rig.runs.count() - 1, resultOf(rootRequest.key, {}));
      await shown;
    });

    it('WHEN a layout lands THEN each title is measured as single-app', () => {
      expect(textSizeOf.mock.calls).toStrictEqual([['single-app']]);
    });

    it('WHEN the layout is shown again from memory THEN each title is measured as single-app again', async () => {
      await layout.show(rootRequest);

      expect(textSizeOf.mock.calls).toStrictEqual([['single-app'], ['single-app']]);
    });

    it('WHEN the layout is shown again from memory THEN the canvas draws with the // title width and the label', async () => {
      await layout.show(rootRequest);

      expect(rig.view.tasks.show).toHaveBeenCalledWith(
        expect.objectContaining({ titleWidths: new Map([['//', 127]]), rootLabel: 'single-app' })
      );
    });
  });

  describe('GIVEN a text sizer that throws', () => {
    describe('WHEN a layout is shown', () => {
      beforeEach(async () => {
        await layoutWith(throwMeasure).show(REQUEST);
      });

      it('THEN it fails through onFailure', () => {
        expect(rig.onFailure).toHaveBeenCalledExactlyOnceWith(MEASURE_FAILED);
      });

      it('THEN no run starts', () => {
        expect(rig.runs.count()).toBe(0);
      });
    });
  });
});
