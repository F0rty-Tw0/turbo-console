import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { viewHandlersOf } from './graph-view-handlers.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const WEB_AT: Position = { x: 1, y: 2 };

const POSITIONS: Positions = { web: WEB_AT };

const BACKGROUND: InspectionInput = { kind: 'background' };

describe('FEATURE: viewHandlersOf', () => {
  describe('GIVEN handlers over fake targets', () => {
    let calls: string[];
    let tap: Mock<(input: InspectionInput) => void>;
    let input: Mock<(input: InspectionInput) => void>;
    let tapFolder: Mock<(folder: string) => void>;
    let openDetailsOf: Mock<(name: string) => void>;
    let saveViewport: Mock<() => void>;
    let keepClearPackage: Mock<() => void>;
    let keepClearTask: Mock<() => void>;
    let toggle: Mock<(folder: string) => void>;
    let dragged: Mock<(positions: Positions) => void>;
    let taskDragged: Mock<() => void>;
    let saveCamera: Mock<() => void>;
    let selectTask: Mock<(id: string) => void>;
    let clearTask: Mock<() => void>;
    let hoverTask: Mock<(id: string | null) => void>;
    let toggleAtoms: Mock<(nodeId: string) => void>;
    let isTaskMode: boolean;
    let handlers: GraphViewHandlers;

    beforeEach((): void => {
      calls = [];
      tap = vi.fn<(input: InspectionInput) => void>();
      input = vi.fn<(input: InspectionInput) => void>();
      tapFolder = vi.fn<(folder: string) => void>();
      openDetailsOf = vi.fn<(name: string) => void>();
      saveViewport = vi.fn<() => void>();
      keepClearPackage = vi.fn<() => void>();
      keepClearTask = vi.fn<() => void>();
      toggle = vi.fn<(folder: string) => void>();
      dragged = vi.fn<(positions: Positions) => void>();
      taskDragged = vi.fn<() => void>();
      saveCamera = vi.fn<() => void>();
      selectTask = vi.fn<(id: string) => void>();
      clearTask = vi.fn<() => void>();
      hoverTask = vi.fn<(id: string | null) => void>();
      toggleAtoms = vi.fn<(nodeId: string) => void>();
      isTaskMode = false;
      const mark = (): void => {
        calls.push('mark');
      };
      const rendered = (): void => {
        calls.push('rendered');
      };
      const inspection = { tap, input, tapFolder, openDetailsOf, saveViewport, keepClear: keepClearPackage };
      const folders = { toggle };
      const filtering = { inspection, folders, rendered };
      const layouts = { dragged };
      const frames = { mark };
      const taskRendered = (): void => {
        calls.push('task rendered');
      };
      const selection = { tapNode: selectTask, clear: clearTask, rendered: taskRendered, keepClear: keepClearTask, hover: hoverTask };
      const atomsRendered = (): void => {
        calls.push('atoms rendered');
      };
      const atoms = { toggle: toggleAtoms, rendered: atomsRendered };
      const layout = { atoms, dragged: taskDragged };
      const tasks = { isActive: (): boolean => isTaskMode, saveCamera, selection, layout };

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

    it('WHEN a node is tapped THEN the inspection taps it from the canvas', () => {
      handlers.onTapNode('web');

      expect(tap).toHaveBeenCalledExactlyOnceWith({ kind: 'select', name: 'web', via: 'canvas' });
    });

    it('WHEN an edge is tapped THEN the inspection taps that link', () => {
      handlers.onTapEdge('web', 'ui');

      expect(tap).toHaveBeenCalledExactlyOnceWith({ kind: 'tapLink', source: 'web', target: 'ui' });
    });

    it('WHEN a folder link is tapped THEN the inspection taps that bundle', () => {
      handlers.onTapBundle('web', collapsedIdOf('packages'));

      expect(tap).toHaveBeenCalledExactlyOnceWith({ kind: 'tapBundle', source: 'web', target: collapsedIdOf('packages') });
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

    it('WHEN a node is double-tapped in package mode THEN no Atomizer group toggles', () => {
      handlers.onDoubleTapNode('web');

      expect(toggleAtoms).not.toHaveBeenCalled();
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

    it('WHEN the canvas re-fits THEN the inspection keeps clear and task mode hears nothing', () => {
      handlers.onRefit();

      expect(keepClearPackage).toHaveBeenCalledOnce();
      expect(keepClearTask).not.toHaveBeenCalled();
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
        handlers.onTapBundle('web#build', collapsedIdOf('packages'));
        handlers.onTapBackground();
        handlers.onTapFolder('apps');
        handlers.onDoubleTapNode('web#build');
        handlers.onDoubleTapFolder('apps');

        const spies = [tap, input, tapFolder, openDetailsOf, toggle];
        const packageCalls = spies.map((spy) => spy.mock.calls.length);

        expect(packageCalls).toStrictEqual([0, 0, 0, 0, 0]);
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
        handlers.onTapBundle('web#build', collapsedIdOf('packages'));
        handlers.onDoubleTapNode('web#build');

        expect(selectTask).not.toHaveBeenCalled();
        expect(clearTask).not.toHaveBeenCalled();
      });

      it('WHEN a node is double-tapped THEN the Atomizer groups toggle it', () => {
        handlers.onDoubleTapNode('web#e2e-ci--tests/b fails.spec.ts');

        expect(toggleAtoms).toHaveBeenCalledExactlyOnceWith('web#e2e-ci--tests/b fails.spec.ts');
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

      it('WHEN the canvas re-fits THEN the task selection keeps clear and the inspection hears nothing', () => {
        handlers.onRefit();

        expect(keepClearTask).toHaveBeenCalledOnce();
        expect(keepClearPackage).not.toHaveBeenCalled();
      });

      it('WHEN a frame renders THEN the frame clock is marked, then the task selection and the group clock hear of it', () => {
        handlers.onRender();

        expect(calls).toStrictEqual(['mark', 'task rendered', 'atoms rendered']);
      });
    });
  });
});
