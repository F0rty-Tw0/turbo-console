import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { GraphTaskSelection } from './graph-task-selection.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskCanvas } from '../common/task-canvas.type.ts';
import type { TaskDetails, TaskDetailsActions, TaskDetailsModel, TaskRuns, TaskWidgets } from '../common/task-details.type.ts';
import { taskDetailsMock, taskWidgetsMock } from '../test/mocks/graph-task-mode.mock.ts';
import { taskCanvasMock } from '../test/mocks/graph-view.mock.ts';
import { API_BUILD_STUB, TASK_CHAIN_STUB, TASK_VIEW_STUB, WEB_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';

type SelectionRig = {
  readonly canvas: Mocked<TaskCanvas>;
  readonly details: Mocked<TaskDetails>;
  readonly widgets: Mocked<TaskWidgets>;
  readonly save: Mock<(edit: Partial<TaskViewState>) => void>;
  readonly view: () => TaskViewState;
};

const WEB_BUILD_MODEL: TaskDetailsModel = { task: WEB_BUILD_STUB, state: null, dependencies: [API_BUILD_STUB] };

const rigOf = (): SelectionRig => {
  const canvas = taskCanvasMock();
  const details = taskDetailsMock();
  const widgets = taskWidgetsMock();
  let saved: TaskViewState = TASK_VIEW_STUB;
  const saving = (edit: Partial<TaskViewState>): void => {
    saved = { ...saved, ...edit };
  };
  const save = vi.fn<(edit: Partial<TaskViewState>) => void>(saving);
  const view = (): TaskViewState => saved;
  const rig: SelectionRig = { canvas, details, widgets, save, view };

  return rig;
};

describe('FEATURE: GraphTaskSelection', () => {
  let rig: SelectionRig;
  let selection: GraphTaskSelection;
  let panelActions: TaskDetailsActions | undefined;

  beforeEach(() => {
    rig = rigOf();

    const view = { tasks: rig.canvas };

    selection = new GraphTaskSelection({
      view,
      detailsOf: (actions: TaskDetailsActions): TaskDetails => {
        panelActions = actions;

        return rig.details;
      },
      widgetsOf: (): TaskWidgets => rig.widgets,
      task: rig.view,
      save: rig.save
    });
    selection.setShown(TASK_CHAIN_STUB);
  });

  describe('GIVEN the chain is shown and nothing is selected', () => {
    it('WHEN web#build is tapped THEN it is saved, painted and shown with api#build as its dependency', () => {
      selection.tapNode('web#build');

      expect(selection.selected()).toBe('web#build');
      expect(rig.save).toHaveBeenLastCalledWith({ selected: 'web#build' });
      expect(rig.canvas.paint).toHaveBeenLastCalledWith('web#build');
      expect(rig.details.show).toHaveBeenLastCalledWith(WEB_BUILD_MODEL);
      expect(rig.widgets.show).toHaveBeenLastCalledWith(WEB_BUILD_MODEL);
    });

    it('WHEN web#build is tapped twice THEN nothing is selected, painted or shown', () => {
      selection.tapNode('web#build');
      selection.tapNode('web#build');

      expect(selection.selected()).toBeNull();
      expect(rig.canvas.paint).toHaveBeenLastCalledWith(null);
      expect(rig.details.show).toHaveBeenLastCalledWith(null);
    });

    it('WHEN the pkg:web compound is tapped THEN nothing is saved', () => {
      selection.tapNode('pkg:web');

      expect(selection.selected()).toBeNull();
      expect(rig.save).not.toHaveBeenCalled();
    });

    it('WHEN a task that is not shown is tapped THEN nothing is saved', () => {
      selection.tapNode('gone#build');

      expect(rig.save).not.toHaveBeenCalled();
    });

    it('WHEN web#build is tapped THEN it keeps clear of the panel after the task "…" moved to it', () => {
      selection.tapNode('web#build');

      const shownAt = rig.widgets.show.mock.invocationCallOrder.at(-1) ?? 0;
      const clearAt = rig.widgets.keepClear.mock.invocationCallOrder[0] ?? 0;

      expect(rig.widgets.keepClear).toHaveBeenCalledOnce();
      expect(clearAt).toBeGreaterThan(shownAt);
    });

    it('WHEN web#build is picked twice from a list THEN it stays selected', () => {
      selection.select('web#build');
      selection.select('web#build');

      expect(selection.selected()).toBe('web#build');
    });
  });

  describe('GIVEN web#build is selected', () => {
    beforeEach(() => {
      selection.tapNode('web#build');
    });

    it('WHEN the selection is cleared THEN nothing is selected and nothing more keeps clear', () => {
      selection.clear();

      expect(selection.selected()).toBeNull();
      expect(rig.canvas.paint).toHaveBeenLastCalledWith(null);
      expect(rig.widgets.keepClear).toHaveBeenCalledOnce();
    });

    it('WHEN the shown tasks keep web#build THEN nothing more keeps clear', () => {
      selection.setShown(TASK_CHAIN_STUB);

      expect(rig.widgets.keepClear).toHaveBeenCalledOnce();
    });

    it('WHEN the panel asks for api#build THEN api#build is selected', () => {
      panelActions?.onSelect('api#build');

      expect(selection.selected()).toBe('api#build');
    });

    it('WHEN the panel asks to clear THEN nothing is selected', () => {
      panelActions?.onClear();

      expect(selection.selected()).toBeNull();
    });

    it('WHEN web#build is running in task mode THEN every map is painted and the panel reads running', () => {
      const runs: TaskRuns = { 'web#build': 'running' };

      selection.enter(true);
      selection.runs(runs);

      const running: TaskDetailsModel = { ...WEB_BUILD_MODEL, state: 'running' };

      expect(rig.canvas.runStates).toHaveBeenLastCalledWith(runs);
      expect(rig.details.show).toHaveBeenLastCalledWith(running);
      expect(rig.widgets.show).toHaveBeenLastCalledWith(running);
    });

    it('WHEN the shown tasks lose web#build THEN the selection is saved as null', () => {
      selection.setShown([API_BUILD_STUB]);

      expect(rig.save).toHaveBeenLastCalledWith({ selected: null });
      expect(rig.details.show).toHaveBeenLastCalledWith(null);
      expect(rig.widgets.show).toHaveBeenLastCalledWith(null);
    });

    it('WHEN the shown tasks keep web#build THEN nothing more is saved', () => {
      rig.save.mockClear();
      selection.setShown(TASK_CHAIN_STUB);

      expect(rig.save).not.toHaveBeenCalled();
      expect(rig.canvas.paint).toHaveBeenLastCalledWith('web#build');
    });
  });

  describe('GIVEN web#build selected and task mode left', () => {
    const runs: TaskRuns = { 'web#build': 'running' };

    beforeEach(() => {
      selection.tapNode('web#build');
      selection.enter(true);
      selection.exit();
      rig.details.show.mockClear();
      rig.canvas.runStates.mockClear();
    });

    it('WHEN runs arrive THEN the hidden panel and the canvas are not repainted', () => {
      selection.runs(runs);

      expect(rig.details.show).not.toHaveBeenCalled();
      expect(rig.canvas.runStates).not.toHaveBeenCalled();
    });

    it('WHEN runs arrive and task mode is entered again THEN the panel reads running', () => {
      selection.runs(runs);
      selection.enter(true);

      expect(rig.canvas.runStates).toHaveBeenLastCalledWith(runs);
      expect(rig.details.show).toHaveBeenLastCalledWith({ ...WEB_BUILD_MODEL, state: 'running' });
    });
  });

  it('GIVEN entering open WHEN left THEN the panel enters open and exits, and the task "…" goes', () => {
    selection.enter(true);
    selection.exit();

    expect(rig.details.enter).toHaveBeenCalledExactlyOnceWith(true);
    expect(rig.details.exit).toHaveBeenCalledTimes(1);
    expect(rig.widgets.exit).toHaveBeenCalledTimes(1);
  });

  it('GIVEN a frame rendered WHEN it is passed on THEN the task "…" follows', () => {
    selection.rendered();

    expect(rig.widgets.rendered).toHaveBeenCalledTimes(1);
  });
});
