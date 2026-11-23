import type { Mock, Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { viewHandlersOf } from './graph-view-handlers.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';
import type { HandledModules } from '../common/module-canvas.type.ts';

describe('FEATURE: viewHandlersOf in modules mode', () => {
  describe('GIVEN handlers over fake targets with modules mode active', () => {
    let calls: string[];
    let tap: Mock<(input: InspectionInput) => void>;
    let toggle: Mock<(folder: string) => void>;
    let taskSaveCamera: Mock<() => void>;
    let selectTask: Mock<(id: string) => void>;
    let modules: Mocked<HandledModules>;
    let handlers: GraphViewHandlers;

    beforeEach((): void => {
      calls = [];
      tap = vi.fn<(input: InspectionInput) => void>();
      toggle = vi.fn<(folder: string) => void>();
      taskSaveCamera = vi.fn<() => void>();
      selectTask = vi.fn<(id: string) => void>();
      const record = (name: string): (() => void) => {
        const push = (): void => {
          calls.push(name);
        };

        return push;
      };
      const inspection = {
        tap,
        input: vi.fn(),
        tapFolder: vi.fn(),
        openDetailsOf: vi.fn(),
        saveViewport: vi.fn(),
        keepClear: vi.fn()
      };
      const folders = { toggle };
      const filtering = { inspection, folders, rendered: record('rendered') };
      const layouts = { dragged: vi.fn() };
      const frames = { mark: record('mark') };
      const selection = { tapNode: selectTask, clear: vi.fn(), rendered: record('task rendered'), keepClear: vi.fn(), hover: vi.fn() };
      const atoms = { toggle: vi.fn(), rendered: record('atoms rendered') };
      const layout = { atoms, dragged: vi.fn() };
      const tasks = { isActive: (): boolean => false, saveCamera: taskSaveCamera, selection, layout };
      const flow = { viewportChanged: record('flow cleared') };

      modules = {
        isActive: vi.fn(() => true),
        tapNode: vi.fn(),
        doubleTapNode: vi.fn(),
        tapBackground: vi.fn(),
        saveCamera: vi.fn(record('modules camera'))
      };
      handlers = viewHandlersOf({
        frames,
        filtering: () => filtering,
        layouts: () => layouts,
        tasks: () => tasks,
        modules: () => modules,
        flow: () => flow
      });
    });

    it('WHEN a node is tapped THEN modules mode gets it and the package inspection does not', () => {
      handlers.onTapNode('file:a.ts');

      expect(modules.tapNode).toHaveBeenCalledExactlyOnceWith('file:a.ts');
      expect(tap).not.toHaveBeenCalled();
    });

    it('WHEN a node is double-tapped THEN modules mode gets it', () => {
      handlers.onDoubleTapNode('file:a.ts');

      expect(modules.doubleTapNode).toHaveBeenCalledExactlyOnceWith('file:a.ts');
    });

    it('WHEN the background is tapped THEN modules mode gets it', () => {
      handlers.onTapBackground();

      expect(modules.tapBackground).toHaveBeenCalledOnce();
    });

    it('WHEN the camera moves THEN the flow overlay clears and modules mode saves its camera', () => {
      handlers.onViewport();

      expect(calls).toStrictEqual(['flow cleared', 'modules camera']);
      expect(taskSaveCamera).not.toHaveBeenCalled();
    });

    it('WHEN a folder is double-tapped THEN nothing is called', () => {
      handlers.onDoubleTapFolder('apps');

      expect(toggle).not.toHaveBeenCalled();
    });

    it('WHEN a task id is tapped THEN task mode selects nothing', () => {
      handlers.onTapNode('web#build');

      expect(selectTask).not.toHaveBeenCalled();
    });

    it('WHEN a frame renders THEN the frame clock marks it and neither side renders', () => {
      handlers.onRender();

      expect(calls).toStrictEqual(['mark']);
    });
  });
});
