import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { viewHandlersOf } from './graph-view-handlers.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';

const WEB_AT: Position = { x: 1, y: 2 };

const POSITIONS: Positions = { web: WEB_AT };

const BACKGROUND: InspectionInput = { kind: 'background' };

describe('FEATURE: viewHandlersOf', () => {
  describe('GIVEN handlers over fake targets', () => {
    let calls: string[];
    let tapNode: Mock<(name: string) => void>;
    let tapEdge: Mock<(source: string, target: string) => void>;
    let input: Mock<(input: InspectionInput) => void>;
    let tapFolder: Mock<(folder: string) => void>;
    let openDetailsOf: Mock<(name: string) => void>;
    let saveViewport: Mock<() => void>;
    let toggle: Mock<(folder: string) => void>;
    let dragged: Mock<(positions: Positions) => void>;
    let taskDragged: Mock<() => void>;
    let saveCamera: Mock<() => void>;
    let selectTask: Mock<(id: string) => void>;
    let clearTask: Mock<() => void>;
    let hoverTask: Mock<(id: string | null) => void>;
    let isTaskMode: boolean;
    let handlers: GraphViewHandlers;

    beforeEach((): void => {
      calls = [];
      tapNode = vi.fn<(name: string) => void>();
      tapEdge = vi.fn<(source: string, target: string) => void>();
      input = vi.fn<(input: InspectionInput) => void>();
      tapFolder = vi.fn<(folder: string) => void>();
      openDetailsOf = vi.fn<(name: string) => void>();
      saveViewport = vi.fn<() => void>();
      toggle = vi.fn<(folder: string) => void>();
      dragged = vi.fn<(positions: Positions) => void>();
      taskDragged = vi.fn<() => void>();
      saveCamera = vi.fn<() => void>();
      selectTask = vi.fn<(id: string) => void>();
      clearTask = vi.fn<() => void>();
      hoverTask = vi.fn<(id: string | null) => void>();
      isTaskMode = false;
      const mark = (): void => {
        calls.push('mark');
      };
      const rendered = (): void => {
        calls.push('rendered');
      };
      const inspection = { tapNode, tapEdge, input, tapFolder, openDetailsOf, saveViewport };
      const folders = { toggle };
      const filtering = { inspection, folders, rendered };
      const layouts = { dragged };
      const frames = { mark };
      const taskRendered = (): void => {
        calls.push('task rendered');
      };
      const selection = { tapNode: selectTask, clear: clearTask, rendered: taskRendered };
      const tasks = { isActive: (): boolean => isTaskMode, dragged: taskDragged, saveCamera, hover: hoverTask, selection };

      const viewportChanged = (): void => {
        calls.push('flow cleared');
      };
      const flow = { viewportChanged };

      handlers = viewHandlersOf({ frames, filtering: () => filtering, layouts: () => layouts, tasks: () => tasks, flow: () => flow });
    });

    it('WHEN a frame renders THEN the frame clock is marked before the filtering hears of it', () => {
      handlers.onRender();

      expect(calls).toStrictEqual(['mark', 'rendered']);
    });

    it('WHEN a node is tapped THEN the inspection taps it', () => {
      handlers.onTapNode('web');

      expect(tapNode).toHaveBeenCalledExactlyOnceWith('web');
    });

    it('WHEN an edge is tapped THEN the inspection taps that link', () => {
      handlers.onTapEdge('web', 'ui');

      expect(tapEdge).toHaveBeenCalledExactlyOnceWith('web', 'ui');
    });

    it('WHEN the background is tapped THEN the inspection gets a background input', () => {
      handlers.onTapBackground();

      expect(input).toHaveBeenCalledExactlyOnceWith(BACKGROUND);
    });

    it('WHEN a folder is tapped THEN the inspection taps it', () => {
      handlers.onTapFolder('apps');

      expect(tapFolder).toHaveBeenCalledExactlyOnceWith('apps');
    });

    it('WHEN a node is double-tapped THEN its details open', () => {
      handlers.onDoubleTapNode('web');

      expect(openDetailsOf).toHaveBeenCalledExactlyOnceWith('web');
    });

    it('WHEN a folder is double-tapped THEN it toggles', () => {
      handlers.onDoubleTapFolder('apps');

      expect(toggle).toHaveBeenCalledExactlyOnceWith('apps');
    });

    it('WHEN a drag ends THEN the layouts get the positions', () => {
      handlers.onDragEnd(POSITIONS);

      expect(dragged).toHaveBeenCalledExactlyOnceWith(POSITIONS);
    });

    it('WHEN the viewport moves THEN the inspection saves it', () => {
      handlers.onViewport();

      expect(saveViewport).toHaveBeenCalledOnce();
    });

    it('WHEN the viewport moves THEN the flow overlay is cleared', () => {
      handlers.onViewport();

      expect(calls).toStrictEqual(['flow cleared']);
    });

    it('WHEN a node is hovered in package mode THEN task mode hears nothing', () => {
      handlers.onHoverNode('web');

      expect(hoverTask).not.toHaveBeenCalled();
    });

    describe('AND task mode is active', () => {
      beforeEach(() => {
        isTaskMode = true;
      });

      it('WHEN nodes, links, the background and folders are tapped once or twice THEN the package side hears nothing', () => {
        handlers.onTapNode('web#build');
        handlers.onTapEdge('web#build', 'ui#build');
        handlers.onTapBackground();
        handlers.onTapFolder('apps');
        handlers.onDoubleTapNode('web#build');
        handlers.onDoubleTapFolder('apps');

        const spies = [tapNode, tapEdge, input, tapFolder, openDetailsOf, toggle];
        const packageCalls = spies.map((spy) => spy.mock.calls.length);

        expect(packageCalls).toStrictEqual([0, 0, 0, 0, 0, 0]);
      });

      it('WHEN a task is tapped THEN task mode taps it', () => {
        handlers.onTapNode('web#build');

        expect(selectTask).toHaveBeenCalledExactlyOnceWith('web#build');
      });

      it('WHEN a task is hovered and the pointer leaves THEN task mode hovers it, then nothing', () => {
        handlers.onHoverNode('web#build');
        handlers.onHoverNode(null);

        expect(hoverTask.mock.calls).toStrictEqual([['web#build'], [null]]);
      });

      it('WHEN the background is tapped THEN task mode clears its selection', () => {
        handlers.onTapBackground();

        expect(clearTask).toHaveBeenCalledOnce();
      });

      it('WHEN a link is tapped or a task double-tapped THEN task mode selects nothing', () => {
        handlers.onTapEdge('web#build', 'ui#build');
        handlers.onDoubleTapNode('web#build');

        expect(selectTask).not.toHaveBeenCalled();
        expect(clearTask).not.toHaveBeenCalled();
      });

      it('WHEN a drag ends THEN task mode keeps it and the layouts hear nothing', () => {
        handlers.onDragEnd(POSITIONS);

        expect(taskDragged).toHaveBeenCalledOnce();
        expect(dragged).not.toHaveBeenCalled();
      });

      it('WHEN the viewport moves THEN task mode saves its camera and the inspection hears nothing', () => {
        handlers.onViewport();

        expect(saveCamera).toHaveBeenCalledOnce();
        expect(saveViewport).not.toHaveBeenCalled();
      });

      it('WHEN the viewport moves THEN the flow overlay is cleared', () => {
        handlers.onViewport();

        expect(calls).toStrictEqual(['flow cleared']);
      });

      it('WHEN a frame renders THEN the frame clock is marked before the task selection hears of it', () => {
        handlers.onRender();

        expect(calls).toStrictEqual(['mark', 'task rendered']);
      });
    });
  });
});
