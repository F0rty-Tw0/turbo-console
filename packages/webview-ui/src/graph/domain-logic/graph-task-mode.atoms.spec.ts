import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphAtomGroup, GraphReady, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { TASK_CHAIN_STUB, TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { umbrellaSizeOf } from '../utils/atom-size.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

/** `web#build` chosen at depth 1 shows itself and the `api#build` it needs. */
const SHOWN = new Set(['api#build', 'web#build']);

const UMBRELLA_FILES = [
  { id: 'web#build--a.spec.ts', specPath: 'a.spec.ts', isLive: false },
  { id: 'web#build--b.spec.ts', specPath: 'b.spec.ts', isLive: false }
];

/** `web#build` stands for an umbrella of two files. */
const UMBRELLA_GROUPS: GraphAtomGroup[] = [{ umbrellaId: 'web#build', files: UMBRELLA_FILES }];

const UMBRELLA_STATE: GraphReady = { ...TASK_STATE_STUB, atomGroups: UMBRELLA_GROUPS };

const UMBRELLA_KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, SHOWN, new Map([['web#build', 2]]));

describe('FEATURE: GraphTaskMode with an Atomizer group', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const shownUmbrellaPosts = (): unknown[] => rig.posts().filter((message) => message.type === 'shownUmbrellas');

  /** A task mode over a real `ViewStateModes` that starts from `saved`. */
  const open = (saved: GraphViewState): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, saved));
    mode = new GraphTaskMode(rig.deps);
  };

  describe('GIVEN a state with a group lands in package mode', () => {
    beforeEach(() => {
      open(taskSavedOf({}, 'packages'));
      mode.received(UMBRELLA_STATE, 7);
    });

    it('WHEN task mode is then entered THEN the umbrella is sized and labelled when its layout lands', async () => {
      mode.toggle(8);
      await rig.runs.settle(0, resultOf(UMBRELLA_KEY, POSITIONS));

      const size = umbrellaSizeOf(rig.deps.sizeOf, 'build', 2);

      expect(rig.view.tasks.show).toHaveBeenCalledWith(
        expect.objectContaining({ sizes: new Map([['web#build', size]]), labels: new Map([['web#build', '2 files']]) })
      );
    });

    it('WHEN task mode is then entered THEN the umbrella is posted in shownUmbrellas', async () => {
      mode.toggle(8);
      await rig.runs.settle(0, resultOf(UMBRELLA_KEY, POSITIONS));

      expect(shownUmbrellaPosts()).toStrictEqual([{ type: 'shownUmbrellas', ids: ['web#build'] }]);
    });
  });

  describe('GIVEN task mode shows the umbrella', () => {
    beforeEach(async () => {
      open(taskSavedOf({}));
      mode.received(UMBRELLA_STATE, 7);
      await rig.runs.settle(0, resultOf(UMBRELLA_KEY, POSITIONS));
    });

    describe('WHEN a state of the same layout key arrives', () => {
      beforeEach(() => {
        mode.received(UMBRELLA_STATE, 9);
      });

      it('THEN shownUmbrellas is posted again', () => {
        const post = { type: 'shownUmbrellas', ids: ['web#build'] };

        expect(shownUmbrellaPosts()).toStrictEqual([post, post]);
      });

      it('THEN nothing is laid out again', () => {
        expect(rig.runs.count()).toBe(1);
        expect(rig.view.tasks.show).toHaveBeenCalledOnce();
      });
    });

    it('WHEN the state arrives with the group gone THEN the umbrella is a plain task laid out afresh', () => {
      mode.received(TASK_STATE_STUB, 9);

      expect(rig.runs.count()).toBe(2);
    });
  });
});
