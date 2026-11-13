import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { NAMING_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { CARD_SIZE_STUB } from '../test/stubs/node-size.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { umbrellaSizeOf } from '../utils/atom-size.util.ts';

const SHOWN = new Set(['api#build', 'web#build']);

const UMBRELLA_FILES = [{ id: 'api#build--a.spec.ts', specPath: 'a.spec.ts', isLive: false }];

const UMBRELLA_GROUP: GraphAtomGroup = { umbrellaId: 'api#build', files: UMBRELLA_FILES };

const leafNamed = (graph: ElkNode, id: string): ElkNode | undefined => {
  const compounds = graph.children ?? [];
  const leaves = compounds.flatMap((compound) => compound.children ?? []);

  return leaves.find((leaf) => leaf.id === id);
};

describe('FEATURE: GraphTaskLayout sizes plain tasks as status cards', () => {
  let rig: TaskModeRig;
  let layout: GraphTaskLayout;

  const landWith = async (sizes: TaskLayoutRequest['sizes']): Promise<void> => {
    const request: TaskLayoutRequest = { tasks: TASK_CHAIN_STUB, shown: SHOWN, key: 'k0', sizes, naming: NAMING_STUB };
    const shown = layout.show(request);

    await rig.runs.settle(0, resultOf('k0', {}));
    await shown;
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
    layout = new GraphTaskLayout({
      ...rig.deps,
      saved: (): null => null,
      rootLabel: (): null => null,
      onPlaced: vi.fn(),
      onDrawn: vi.fn()
    });
  });

  describe('GIVEN no umbrella', () => {
    beforeEach(async () => {
      await landWith(new Map());
    });

    it('WHEN a layout is laid out THEN ELK gets the plain task at the card size', () => {
      const leaf = leafNamed(rig.runs.graphOf(0), 'api#build');

      expect(leaf).toMatchObject(CARD_SIZE_STUB);
    });

    it('WHEN a layout lands THEN the canvas draws with the card sizer', () => {
      expect(rig.view.tasks.show).toHaveBeenCalledWith(expect.objectContaining({ sizeOf: rig.deps.cardSizeOf }));
    });
  });

  describe('GIVEN api#build is an umbrella beside the plain web#build', () => {
    const sizers = (): Parameters<typeof umbrellaSizeOf>[0] => {
      const own = { name: rig.deps.sizeOf, chips: rig.deps.chipMeasure, glyphs: rig.deps.glyphs };

      return own;
    };

    beforeEach(async () => {
      layout.atoms.received([UMBRELLA_GROUP]);
      await landWith(new Map([['api#build', umbrellaSizeOf(sizers(), 'build', 1)]]));
    });

    it('WHEN a layout is laid out THEN ELK gets the umbrella at its own size', () => {
      const leaf = leafNamed(rig.runs.graphOf(0), 'api#build');

      expect(leaf).toMatchObject(umbrellaSizeOf(sizers(), 'build', 1));
    });

    it('WHEN a layout is laid out THEN ELK gets the plain task beside it at the card size', () => {
      const leaf = leafNamed(rig.runs.graphOf(0), 'web#build');

      expect(leaf).toMatchObject(CARD_SIZE_STUB);
    });
  });
});
