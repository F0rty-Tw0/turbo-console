import { describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphShownTaskPackagesMessage } from '../../bridge/common/graph-message.type.ts';
import type { GraphReady, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { GROUPED_NAMING_STUB, TASK_CHAIN_STUB, TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

/** `web#build` chosen at depth 1 shows itself and the `api#build` it needs. */
const SHOWN = new Set(['api#build', 'web#build']);

const PLAIN_KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, SHOWN, new Map(), GROUPED_NAMING_STUB);

const SHOWN_STATE: GraphReady = { ...TASK_STATE_STUB, predictionShown: true };

const NAMES: GraphShownTaskPackagesMessage = { type: 'shownTaskPackages', packageNames: ['api', 'web'] };

describe('FEATURE: GraphTaskMode cache prediction posts', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const packagePosts = (): unknown[] => rig.posts().filter((message) => message.type === 'shownTaskPackages');

  /** A task mode over a real `ViewStateModes` that starts from `saved`. */
  const open = (saved: GraphViewState): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, saved));
    mode = new GraphTaskMode(rig.deps);
  };

  /** Task mode over its tasks with the toggle at `predictionShown`, the layout landed. */
  const shownWith = async (predictionShown: boolean): Promise<void> => {
    open(taskSavedOf({}));
    mode.received({ ...TASK_STATE_STUB, predictionShown }, 7);
    await rig.runs.settle(0, resultOf(PLAIN_KEY, POSITIONS));
  };

  describe('GIVEN a restored panel in packages mode with the toggle on', () => {
    const openInPackages = (): void => {
      open(taskSavedOf({}, 'packages'));
      mode.received(SHOWN_STATE, 7);
    };

    it('WHEN the state arrives THEN nothing is posted and nothing is laid out', () => {
      openInPackages();

      expect([packagePosts(), rig.runs.count()]).toStrictEqual([[], 0]);
    });

    it('WHEN task mode is then entered THEN shownTaskPackages is posted once', async () => {
      openInPackages();
      mode.enter(8);
      await rig.runs.settle(0, resultOf(PLAIN_KEY, POSITIONS));

      expect(packagePosts()).toStrictEqual([NAMES]);
    });

    it('WHEN task mode is entered, left and entered again THEN it is posted once per entry', async () => {
      openInPackages();
      mode.enter(8);
      await rig.runs.settle(0, resultOf(PLAIN_KEY, POSITIONS));
      mode.leave();
      mode.enter(9);

      expect(packagePosts()).toStrictEqual([NAMES, NAMES]);
    });

    it('WHEN task mode is entered and left THEN nothing is posted while out', async () => {
      openInPackages();
      mode.enter(8);
      await rig.runs.settle(0, resultOf(PLAIN_KEY, POSITIONS));
      mode.leave();
      mode.received(SHOWN_STATE, 9);

      expect(packagePosts()).toStrictEqual([NAMES]);
    });
  });

  describe('GIVEN task mode shows tasks with the toggle off', () => {
    it('WHEN the layout lands THEN nothing is posted', async () => {
      await shownWith(false);

      expect(packagePosts()).toStrictEqual([]);
    });

    it('WHEN a state with the toggle on arrives THEN one post follows', async () => {
      await shownWith(false);
      mode.received(SHOWN_STATE, 8);

      expect(packagePosts()).toStrictEqual([NAMES]);
    });

    it('WHEN the same state with the toggle on arrives twice THEN only one post follows', async () => {
      await shownWith(false);
      mode.received(SHOWN_STATE, 8);
      mode.received(SHOWN_STATE, 9);

      expect(packagePosts()).toStrictEqual([NAMES]);
    });

    it('WHEN the toggle goes on, off and on THEN two posts in all', async () => {
      await shownWith(false);
      mode.received(SHOWN_STATE, 8);
      mode.received(TASK_STATE_STUB, 9);
      mode.received(SHOWN_STATE, 10);

      expect(packagePosts()).toStrictEqual([NAMES, NAMES]);
    });
  });

  describe('GIVEN task mode shows tasks with the toggle on', () => {
    it('WHEN the layout lands THEN shownTaskPackages is posted once', async () => {
      await shownWith(true);

      expect(packagePosts()).toStrictEqual([NAMES]);
    });

    it('WHEN the same state arrives again THEN nothing more is posted', async () => {
      await shownWith(true);
      mode.received(SHOWN_STATE, 8);

      expect(packagePosts()).toStrictEqual([NAMES]);
    });

    it('WHEN a message replaces the page and the same state arrives again THEN it is posted once more', async () => {
      await shownWith(true);
      mode.suspend();
      mode.received(SHOWN_STATE, 8);

      expect(packagePosts()).toStrictEqual([NAMES, NAMES]);
    });
  });
});
