import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphAtomGroup, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec } from '../common/atom-layout.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import { TASK_LAYOUT_MEMORY } from '../common/graph-task.const.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { atomPositionsOf } from '../utils/atom-positions.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const POSITIONS: Positions = { 'api#build': API_AT };

const SHOWN = new Set(['api#build']);

const PLACE_FAILED = new Error('cannot draw');

const UMBRELLA_SIZE: NodeSize = { width: 200, height: 48 };

const firstCompoundOf = (graph: ElkNode): ElkNode | undefined => graph.children?.[0];

const firstLeafOf = (compound: ElkNode | undefined): ElkNode | undefined => compound?.children?.[0];

const UMBRELLA_FILES = [{ id: 'api#build--a.spec.ts', specPath: 'a.spec.ts', isLive: false }];

const UMBRELLA_GROUP: GraphAtomGroup = { umbrellaId: 'api#build', files: UMBRELLA_FILES };

const NO_SIZES: ReadonlyMap<string, NodeSize> = new Map();

const sizedRequestOf = (key: string, sizes: ReadonlyMap<string, NodeSize>): TaskLayoutRequest => {
  const request: TaskLayoutRequest = { tasks: TASK_CHAIN_STUB, shown: SHOWN, key, sizes };

  return request;
};

const requestOf = (key: string): TaskLayoutRequest => sizedRequestOf(key, NO_SIZES);

const throwPlace = (): never => {
  throw PLACE_FAILED;
};

describe('FEATURE: GraphTaskLayout', () => {
  let rig: TaskModeRig;
  let layout: GraphTaskLayout;
  let onDrawn: Mock<() => void>;

  /** Shows the layout of `key` and lands it as the latest run. */
  const landWith = async (key: string, sizes: ReadonlyMap<string, NodeSize>): Promise<void> => {
    const shown = layout.show(sizedRequestOf(key, sizes));

    await rig.runs.settle(rig.runs.count() - 1, resultOf(key, POSITIONS));
    await shown;
  };

  const land = async (key: string): Promise<void> => landWith(key, NO_SIZES);

  /** Lands `count` layouts, keys `k0` to `k<count - 1>`, oldest first. */
  const landEach = async (count: number): Promise<void> => {
    for (let index = 0; index < count; index++) await land(`k${index}`);
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
    onDrawn = vi.fn<() => void>();
    layout = new GraphTaskLayout({ ...rig.deps, saved: (): null => null, rootLabel: (): null => null, onPlaced: vi.fn(), onDrawn });
  });

  describe('GIVEN the flow overlay', () => {
    it('WHEN a layout lands THEN the flow stops before the canvas draws it', async () => {
      await land('k0');

      const stoppedAt = rig.flow.stop.mock.invocationCallOrder[0] ?? Number.NaN;
      const shownAt = rig.view.tasks.show.mock.invocationCallOrder[0] ?? Number.NaN;

      expect(stoppedAt).toBeLessThan(shownAt);
    });

    it('WHEN a layout lands THEN the drawn highlight goes back to the flow once the camera is set', async () => {
      await land('k0');

      const fitAt = rig.view.fit.mock.invocationCallOrder[0] ?? Number.NaN;
      const drawnAt = onDrawn.mock.invocationCallOrder[0] ?? Number.NaN;

      expect(onDrawn).toHaveBeenCalledOnce();
      expect(fitAt).toBeLessThan(drawnAt);
    });

    it('WHEN the task canvas is cleared THEN the flow stops', () => {
      layout.clear();

      expect(rig.flow.stop).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN api#build is an umbrella of one file', () => {
    const sizes = new Map([['api#build', UMBRELLA_SIZE]]);

    beforeEach(() => {
      layout.atoms.received([UMBRELLA_GROUP]);
    });

    it('WHEN a layout is laid out THEN ELK gets the umbrella at its own size', async () => {
      await landWith('k0', sizes);

      const compound = firstCompoundOf(rig.runs.graphOf(0));
      const leaf = firstLeafOf(compound);

      expect(leaf).toMatchObject({ id: 'api#build', ...UMBRELLA_SIZE });
    });

    it('WHEN a layout lands THEN the canvas draws the sizes and the counts lines', async () => {
      await landWith('k0', sizes);

      expect(rig.view.tasks.show).toHaveBeenCalledWith(
        expect.objectContaining({ sizes, labels: new Map([['api#build', '1 files']]) })
      );
    });

    it('WHEN a layout lands THEN the umbrella is reported to the host', async () => {
      await landWith('k0', sizes);

      expect(rig.posts()).toStrictEqual([{ type: 'shownUmbrellas', ids: ['api#build'] }]);
    });

    it('WHEN the task canvas is cleared THEN the placement is forgotten', async () => {
      await landWith('k0', sizes);
      layout.clear();
      layout.atoms.reshown();

      expect(rig.posts()).toHaveLength(1);
    });
  });

  describe('GIVEN api#build is an umbrella that is expanded', () => {
    const sizes = new Map([['api#build', UMBRELLA_SIZE]]);
    const expandedAt = async (key: string): Promise<void> => landWith(key, sizes);

    beforeEach(async () => {
      layout.atoms.received([UMBRELLA_GROUP]);
      await expandedAt('k0');
      layout.atoms.toggle('api#build');
      rig.view.atoms.expand.mockClear();
    });

    it('WHEN Re-layout lands THEN ELK gets the collapsed graph and the group is drawn again', async () => {
      const relaid = layout.relayout();

      await rig.runs.settle(1, resultOf('k0', POSITIONS));
      await relaid;

      const leaves = firstCompoundOf(rig.runs.graphOf(1))?.children ?? [];

      expect(leaves.map((leaf) => leaf.id)).toStrictEqual(['api#build']);
      expect(rig.view.atoms.expand).toHaveBeenCalledOnce();
    });

    it('WHEN the task canvas is cleared THEN the group collapses before the canvas empties', () => {
      layout.clear();

      expect(rig.view.atoms.collapse).toHaveBeenCalledExactlyOnceWith('api#build', 'pkg:api');
      expect(rig.view.atoms.setGrabbable).toHaveBeenLastCalledWith(true);
    });
  });

  describe('GIVEN api#build is a collapsed umbrella and the layout was dragged', () => {
    const sizes = new Map([['api#build', UMBRELLA_SIZE]]);
    const DRAGGED_POINT: Position = { x: 500, y: 600 };
    const DRAGGED_AT: Positions = { 'api#build': DRAGGED_POINT };

    beforeEach(async () => {
      layout.atoms.received([UMBRELLA_GROUP]);
      await landWith('k0', sizes);
      rig.view.tasks.positions.mockReturnValue(DRAGGED_AT);
      layout.dragged();
    });

    it('WHEN the group expands THEN its positions start from the dragged centres', () => {
      const spec: AtomBoxSpec = { umbrellaId: 'api#build', umbrellaSize: UMBRELLA_SIZE, fileIds: ['api#build--a.spec.ts'] };
      const { positions } = atomPositionsOf(DRAGGED_AT, [spec], SHOWN);

      layout.atoms.toggle('api#build');

      expect(rig.view.atoms.setPositions).toHaveBeenLastCalledWith(positions);
    });
  });

  describe('GIVEN as many layouts landed as page memory keeps', () => {
    beforeEach(async () => {
      await landEach(TASK_LAYOUT_MEMORY);
    });

    it('WHEN the first key is shown again THEN it is placed from memory with no run', async () => {
      await layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(TASK_LAYOUT_MEMORY);
    });

    it('WHEN one more lands and the first key is shown again THEN it is laid out afresh', async () => {
      await land('extra');
      void layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(TASK_LAYOUT_MEMORY + 2);
    });

    it('WHEN the first key is shown again before one more lands THEN the first key stays in memory', async () => {
      await layout.show(requestOf('k0'));
      await land('extra');
      void layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(TASK_LAYOUT_MEMORY + 1);
    });
  });

  describe('GIVEN a canvas that throws on drawing', () => {
    beforeEach(() => {
      rig.view.tasks.show.mockImplementation(throwPlace);
    });

    it('WHEN a run lands THEN the failure is reported, the canvas emptied and the key forgotten', async () => {
      await land('k0');

      expect(rig.onFailure).toHaveBeenCalledExactlyOnceWith(PLACE_FAILED);
      expect(rig.view.tasks.clear).toHaveBeenCalledOnce();
      expect(layout.key()).toBeNull();
    });

    it('WHEN Re-layout lands THEN the failure is reported', async () => {
      rig.view.tasks.show.mockReset();
      await land('k0');
      rig.view.tasks.show.mockImplementation(throwPlace);

      const relaid = layout.relayout();

      await rig.runs.settle(1, resultOf('k0', POSITIONS));
      await relaid;

      expect(rig.onFailure).toHaveBeenCalledExactlyOnceWith(PLACE_FAILED);
    });
  });

  it('GIVEN a placed layout and a canvas that then throws WHEN its key is shown again from memory THEN the failure is reported', async () => {
    await land('k0');
    rig.view.tasks.show.mockImplementation(throwPlace);

    await layout.show(requestOf('k0'));

    expect(rig.onFailure).toHaveBeenCalledExactlyOnceWith(PLACE_FAILED);
  });

  it('GIVEN a run in flight WHEN another key is asked for and the first run fails THEN nothing is reported and the second stays asked for', async () => {
    const first = layout.show(requestOf('k0'));

    void layout.show(requestOf('k1'));
    await rig.runs.fail(0, PLACE_FAILED);
    await first;

    expect(rig.onFailure).not.toHaveBeenCalled();
    expect(layout.key()).toBe('k1');
  });
});
