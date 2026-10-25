import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphAtomGroup, GraphReady, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import { ATOM_COUNTS_LINE_PX } from '../common/graph-atom.const.ts';
import type { NodeSizer, ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskModeDeps } from '../common/graph-task.type.ts';
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

const PLAIN_KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, SHOWN, new Map());

describe('FEATURE: GraphTaskMode with an Atomizer group', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const shownUmbrellaPosts = (): unknown[] => rig.posts().filter((message) => message.type === 'shownUmbrellas');

  /** A task mode over a real `ViewStateModes` that starts from `saved`. */
  const open = (saved: GraphViewState, sizers: Partial<Pick<TaskModeDeps, 'sizeOf' | 'textSizeOf'>> = {}): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, saved));
    mode = new GraphTaskMode({ ...rig.deps, ...sizers });
  };

  describe('GIVEN a state with a group lands in package mode', () => {
    beforeEach(() => {
      open(taskSavedOf({}, 'packages'));
      mode.received(UMBRELLA_STATE, 7);
    });

    it('WHEN task mode is then entered THEN the umbrella is sized and labelled when its layout lands', async () => {
      mode.toggle(8);
      await rig.runs.settle(0, resultOf(UMBRELLA_KEY, POSITIONS));

      const size = umbrellaSizeOf({ name: rig.deps.sizeOf, counts: rig.deps.textSizeOf }, 'build', 2);

      expect(rig.view.tasks.show).toHaveBeenCalledWith(
        expect.objectContaining({ sizes: new Map([['web#build', size]]), labels: new Map([['web#build', '2 files']]) })
      );
    });

    it.each([
      ['counts', { width: 150, height: 20 }, { width: 100, height: 30 }, 150],
      ['name', { width: 150, height: 20 }, { width: 200, height: 30 }, 200]
    ])('WHEN the %s line is wider THEN the umbrella takes its width and the name height', async (_wider, counts, name, width) => {
      const sizeOf: NodeSizer = () => name;
      const textSizeOf: NodeSizer = () => counts;

      open(taskSavedOf({}, 'packages'), { sizeOf, textSizeOf });
      mode.received(UMBRELLA_STATE, 7);

      mode.toggle(8);
      await rig.runs.settle(0, resultOf(UMBRELLA_KEY, POSITIONS));

      const sizes = new Map([['web#build', { width, height: 30 + ATOM_COUNTS_LINE_PX }]]);

      expect(rig.view.tasks.show).toHaveBeenCalledWith(expect.objectContaining({ sizes }));
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

    describe('WHEN the group is expanded', () => {
      beforeEach(() => {
        mode.layout.atoms.toggle('web#build');
        rig.view.atoms.expand.mockClear();
      });

      it('THEN a state of the same key with other files replaces the files and positions them again', () => {
        const renamed = [
          { id: 'web#build--c.spec.ts', specPath: 'c.spec.ts', isLive: false },
          { id: 'web#build--d.spec.ts', specPath: 'd.spec.ts', isLive: false }
        ];
        const group: GraphAtomGroup = { umbrellaId: 'web#build', files: renamed };
        const replaced: GraphReady = { ...UMBRELLA_STATE, atomGroups: [group] };

        mode.received(replaced, 9);

        expect(rig.view.atoms.collapse).toHaveBeenCalledOnce();
        expect(rig.view.atoms.expand).toHaveBeenCalledOnce();
        expect(rig.runs.count()).toBe(1);
      });

      it('THEN leaving task mode collapses it and lets the canvas grab again', () => {
        mode.toggle(9);

        expect(rig.view.atoms.collapse).toHaveBeenCalledExactlyOnceWith('web#build', 'pkg:web');
        expect(rig.view.atoms.setGrabbable).toHaveBeenLastCalledWith(true);
      });

      it('THEN entering task mode again draws the group collapsed', async () => {
        mode.toggle(9);
        mode.toggle(10);
        await Promise.resolve();

        expect(rig.view.tasks.show).toHaveBeenCalledTimes(2);
        expect(rig.view.atoms.expand).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the state arrives with the group gone', () => {
      beforeEach(async () => {
        mode.received(TASK_STATE_STUB, 9);
        await rig.runs.settle(1, resultOf(PLAIN_KEY, POSITIONS));
      });

      it('THEN the umbrella is a plain task laid out afresh', () => {
        expect(rig.runs.count()).toBe(2);
      });

      it('THEN the layout is drawn with no umbrella sizes', () => {
        const drawing = rig.view.tasks.show.mock.lastCall?.[0];

        expect(drawing?.sizes).toStrictEqual(new Map());
      });
    });
  });
});
