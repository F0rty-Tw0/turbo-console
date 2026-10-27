import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { GraphTaskSelection } from './graph-task-selection.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FlowEdgeGeometry } from '../common/flow.type.ts';
import type { TaskCanvas } from '../common/task-canvas.type.ts';
import { taskDetailsMock, taskWidgetsMock } from '../test/mocks/graph-task-mode.mock.ts';
import { taskCanvasMock } from '../test/mocks/graph-view.mock.ts';
import { TASK_CHAIN_STUB, TASK_VIEW_STUB } from '../test/stubs/graph-task.stub.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const LIT_EDGE: FlowEdgeGeometry = { source: ORIGIN, target: ORIGIN, controlPoints: [] };

describe('FEATURE: GraphTaskSelection tells the flow overlay', () => {
  let canvas: Mocked<TaskCanvas>;
  let litEdges: FlowEdgeGeometry[];
  let onHighlight: Mock<(litEdgeCount: number) => void>;
  let selection: GraphTaskSelection;

  beforeEach(() => {
    let saved: TaskViewState = TASK_VIEW_STUB;
    const save = (edit: Partial<TaskViewState>): void => {
      saved = { ...saved, ...edit };
    };
    const flowEdges = (): FlowEdgeGeometry[] => litEdges;

    canvas = taskCanvasMock();
    litEdges = [LIT_EDGE];

    const view = { tasks: canvas, flowEdges };

    onHighlight = vi.fn<(litEdgeCount: number) => void>();
    selection = new GraphTaskSelection({
      view,
      detailsOf: taskDetailsMock,
      widgetsOf: taskWidgetsMock,
      task: (): TaskViewState => saved,
      rootLabel: (): null => null,
      save,
      onHighlight
    });
    selection.setShown(TASK_CHAIN_STUB);
    selection.enter(true);
    onHighlight.mockClear();
  });

  describe('GIVEN the chain shown with nothing selected', () => {
    it('WHEN web#build is hovered THEN the flow hears of a highlight after the canvas paints it', () => {
      selection.hover('web#build');

      const paintedAt = canvas.paint.mock.invocationCallOrder.at(-1) ?? Number.NaN;
      const heardAt = onHighlight.mock.invocationCallOrder[0] ?? Number.NaN;

      expect(onHighlight).toHaveBeenCalledExactlyOnceWith(1);
      expect(paintedAt).toBeLessThan(heardAt);
    });

    it('WHEN web#build is hovered and the pointer leaves THEN the flow hears the highlight is gone', () => {
      selection.hover('web#build');
      selection.hover(null);

      expect(onHighlight).toHaveBeenLastCalledWith(0);
    });

    it('WHEN web#build is tapped THEN the flow hears of a highlight', () => {
      selection.tapNode('web#build');

      expect(onHighlight).toHaveBeenLastCalledWith(1);
    });

    it('WHEN web#build is hovered with three edges lit THEN the flow hears the count of three', () => {
      litEdges = [LIT_EDGE, LIT_EDGE, LIT_EDGE];
      selection.hover('web#build');

      expect(onHighlight).toHaveBeenCalledExactlyOnceWith(3);
    });

    it('WHEN web#build is hovered while no edge is lit THEN the flow hears of no highlight', () => {
      litEdges = [];
      selection.hover('web#build');

      expect(onHighlight).toHaveBeenCalledExactlyOnceWith(0);
    });

    it('WHEN the task layout is placed THEN the flow hears of no highlight', () => {
      selection.placed();

      expect(onHighlight).toHaveBeenCalledExactlyOnceWith(0);
    });
  });

  describe('GIVEN web#build selected', () => {
    beforeEach(() => {
      selection.tapNode('web#build');
      onHighlight.mockClear();
    });

    it('WHEN runs arrive THEN the run states are painted and the flow hears nothing', () => {
      selection.runs({ 'web#build': 'running' });

      expect(canvas.runStates).toHaveBeenLastCalledWith({ 'web#build': 'running' });
      expect(onHighlight).not.toHaveBeenCalled();
    });

    it('WHEN the task layout is placed THEN the flow hears of the highlight again and the canvas is not repainted', () => {
      canvas.paint.mockClear();
      selection.placed();

      expect(onHighlight).toHaveBeenCalledExactlyOnceWith(1);
      expect(canvas.paint).not.toHaveBeenCalled();
    });

    it('WHEN the shown tasks lose web#build THEN the flow hears the highlight is gone', () => {
      selection.setShown([]);

      expect(onHighlight).toHaveBeenLastCalledWith(0);
    });
  });
});
