import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskPanelActions } from '../common/graph-task.type.ts';
import type { LocationFacts } from '../common/location.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';

/** Package mode with `api#build` chosen under a placed layout's key. */
const API_SAVED = taskSavedOf({ chosen: ['api#build'], layoutKey: 'api-key' }, 'packages');

/** The rig over a real `ViewStateModes` that starts from `saved`, with `selected` picked in the package graph. */
const rigOf = (saved: GraphViewState | null, selected: string | null): TaskModeRig => {
  const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };
  const modes = new ViewStateModes(saver, saved);
  const rig = taskModeRigOf(modes);

  rig.selectedPackage.mockReturnValue(selected);

  return rig;
};

const panelActionsOf = (rig: TaskModeRig): TaskPanelActions | undefined => rig.panelOf.mock.lastCall?.[0];

describe('FEATURE: GraphTaskMode Tasks entry', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const open = (saved: GraphViewState | null, selected: string | null): void => {
    rig = rigOf(saved, selected);
    mode = new GraphTaskMode(rig.deps);
    mode.received(TASK_STATE_STUB, 7);
  };

  describe('GIVEN package mode with nothing saved', () => {
    it('WHEN Tasks is pressed with web selected THEN web’s tasks are chosen and laid out from the press', () => {
      open(null, 'web');
      mode.enter(8);

      expect(rig.modes.task()?.chosen).toStrictEqual(['web#build', 'web#lint']);
      expect(rig.runs.count()).toBe(1);
      expect(rig.frames.start).toHaveBeenCalledExactlyOnceWith(8);
    });

    it.each([{ selected: null }, { selected: 'docs' }])(
      'WHEN Tasks is pressed with $selected selected THEN the prompt offers all 3 known tasks and nothing is laid out',
      ({ selected }) => {
        open(null, selected);
        mode.enter(8);

        expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: true, hiddenCount: 0, knownCount: 3 });
        expect(rig.runs.count()).toBe(0);
      }
    );

    it('WHEN Show every task is pressed on the prompt THEN every task is chosen and laid out from the press', () => {
      open(null, null);
      mode.enter(8);
      panelActionsOf(rig)?.onShowEvery(9);

      expect(rig.modes.task()?.chosen).toStrictEqual(['api#build', 'web#build', 'web#lint']);
      expect(rig.frames.start).toHaveBeenLastCalledWith(9);
    });
  });

  describe('GIVEN package mode with api#build saved under a placed layout', () => {
    it('WHEN Tasks is pressed with web selected THEN web’s tasks replace the saved choice', () => {
      open(API_SAVED, 'web');
      mode.enter(8);

      expect(rig.modes.task()).toMatchObject({ chosen: ['web#build', 'web#lint'], layoutKey: '' });
    });

    it.each([{ selected: null }, { selected: 'docs' }])(
      'WHEN Tasks is pressed with $selected selected THEN the saved choice and its layout key are kept',
      ({ selected }) => {
        open(API_SAVED, selected);
        mode.enter(8);

        expect(rig.modes.task()).toMatchObject({ chosen: ['api#build'], layoutKey: 'api-key' });
        expect(rig.runs.count()).toBe(1);
      }
    );
  });

  describe('GIVEN package mode with web’s tasks saved under a placed layout and web#lint selected', () => {
    it('WHEN Tasks is pressed with web selected THEN the saved layout key and selected task are kept', () => {
      const saved = taskSavedOf({ chosen: ['web#lint', 'web#build'], selected: 'web#lint', layoutKey: 'web-key' }, 'packages');

      open(saved, 'web');
      mode.enter(8);

      expect(rig.modes.task()).toMatchObject({ layoutKey: 'web-key', selected: 'web#lint' });
    });
  });

  describe('GIVEN task mode with api#build chosen and laid out', () => {
    beforeEach(() => {
      open(taskSavedOf({ chosen: ['api#build'] }), 'web');
    });

    it('WHEN Tasks is pressed again with web selected THEN nothing is chosen or laid out again', () => {
      mode.enter(8);

      expect(rig.modes.task()?.chosen).toStrictEqual(['api#build']);
      expect(rig.runs.count()).toBe(1);
    });

    it('WHEN Packages is pressed THEN the location bar reads again once the page is back in package mode', () => {
      const order: string[] = [];

      rig.onExit.mockImplementation((): void => {
        order.push('exit');
      });
      rig.onLocation.mockImplementation((): void => {
        order.push(`location in ${rig.modes.mode()}`);
      });
      mode.leave();

      expect(order).toStrictEqual(['exit', 'location in packages']);
    });

    it('WHEN the location facts are read THEN they name api and count api#build and its dependent web#build', () => {
      const facts: LocationFacts = { taskPackage: 'api', taskCount: 2, isSinglePackage: false };

      expect(mode.locationFacts()).toStrictEqual(facts);
    });

    it('WHEN the panel reports a shown set THEN the location bar reads again', () => {
      rig.onLocation.mockClear();
      panelActionsOf(rig)?.onShown();

      expect(rig.onLocation).toHaveBeenCalledOnce();
    });
  });
});
