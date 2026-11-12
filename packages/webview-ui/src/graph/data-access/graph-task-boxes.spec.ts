import type { ElementDefinition } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { boxesOf } from './graph-task-boxes.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { ROOT_TASKS_TITLE } from '../common/graph-task.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const TURBO = taskOf('app#build', []);

const SCRIPT = scriptOf('app#dev', []);

const BUILD_AT: Position = { x: 0, y: 0 };

const DEV_AT: Position = { x: 0, y: 100 };

const POSITIONS: Positions = { 'app#build': BUILD_AT, 'app#dev': DEV_AT };

const TITLE_WIDTHS = new Map([
  ['app', 31],
  ['scripts:app', 71]
]);

const drawingOf = (tasks: GraphTask[]): TaskDrawing => {
  const drawing: TaskDrawing = {
    tasks,
    positions: POSITIONS,
    boxFrames: {},
    sizeOf: (): NodeSize => NODE_SIZE,
    sizes: new Map(),
    counts: new Map(),
    titleWidths: TITLE_WIDTHS,
    rootLabel: null,
    naming: NAMING_STUB
  };

  return drawing;
};

const SCRIPTS_DATA = { id: 'scripts:app', parent: 'pkg:app', title: 'Scripts', minWidth: 71 };

const APPS_ID = folderIdOf('apps');

/** `app` sits in the folder `apps`. */
const GROUPED: TaskNaming = { ...NAMING_STUB, grouped: true, folders: new Map([['app', 'apps']]) };

const groupedDrawingOf = (tasks: GraphTask[]): TaskDrawing => {
  const drawing = drawingOf(tasks);
  const titleWidths = new Map([...TITLE_WIDTHS, [APPS_ID, 41]]);
  const grouped: TaskDrawing = { ...drawing, titleWidths, naming: GROUPED };

  return grouped;
};

const FOLDER_DATA = { id: APPS_ID, title: folderTitleOf('apps'), minWidth: 41 };

const NESTED_PACKAGE_DATA = { id: 'pkg:app', title: 'app', minWidth: 31, parent: APPS_ID };

const PACKAGE_DATA = { id: 'pkg:app', title: 'app', minWidth: 31 };

const idOf = (definition: ElementDefinition): string | undefined => definition.data.id;

const isFolderBox = (definition: ElementDefinition): boolean => definition.classes === 'task-folder';

const titleOf = (drawing: TaskDrawing): unknown => boxesOf(drawing).find((box) => box.classes === 'task-box')?.data['title'];

describe('FEATURE: boxesOf', () => {
  describe('GIVEN app with the turbo task app#build and the script app#dev', () => {
    describe('WHEN the boxes are listed', () => {
      it('THEN the package box comes before the Scripts box inside it', () => {
        const ids = boxesOf(drawingOf([TURBO, SCRIPT])).map(idOf);

        expect(ids).toStrictEqual(['pkg:app', 'scripts:app']);
      });

      it('THEN the Scripts box sits in pkg:app, titled Scripts, as wide as its title width', () => {
        const [, scripts] = boxesOf(drawingOf([TURBO, SCRIPT]));

        expect(scripts).toStrictEqual({ data: SCRIPTS_DATA, classes: 'task-scripts' });
      });
    });
  });

  describe('GIVEN app with only the turbo task app#build, ungrouped', () => {
    describe('WHEN the boxes are listed', () => {
      it('THEN there is only the package box', () => {
        const ids = boxesOf(drawingOf([TURBO])).map(idOf);

        expect(ids).toStrictEqual(['pkg:app']);
      });

      it('THEN there is no folder box', () => {
        const folders = boxesOf(drawingOf([TURBO])).filter(isFolderBox);

        expect(folders).toStrictEqual([]);
      });

      it('THEN the package box has no parent', () => {
        const [pkg] = boxesOf(drawingOf([TURBO]));

        expect(pkg).toStrictEqual({ data: PACKAGE_DATA, classes: 'task-box' });
      });
    });
  });

  describe('GIVEN a Scripts box with no title width', () => {
    it('WHEN the boxes are listed THEN its minimum width is 0', () => {
      const untitled = drawingOf([SCRIPT]);
      const drawing: TaskDrawing = { ...untitled, titleWidths: new Map() };

      const [, scripts] = boxesOf(drawing);

      expect(scripts?.data['minWidth']).toBe(0);
    });
  });

  describe('GIVEN grouped and app in apps', () => {
    describe('WHEN the boxes are listed', () => {
      it('THEN the folder box comes first, then the package and Scripts boxes', () => {
        const ids = boxesOf(groupedDrawingOf([TURBO, SCRIPT])).map(idOf);

        expect(ids).toStrictEqual([APPS_ID, 'pkg:app', 'scripts:app']);
      });

      it('THEN the folder box is a task-folder titled by its folder, as wide as its title width', () => {
        const [folder] = boxesOf(groupedDrawingOf([TURBO]));

        expect(folder).toStrictEqual({ data: FOLDER_DATA, classes: 'task-folder' });
      });

      it('THEN the package box sits in the folder box', () => {
        const [, pkg] = boxesOf(groupedDrawingOf([TURBO]));

        expect(pkg).toStrictEqual({ data: NESTED_PACKAGE_DATA, classes: 'task-box' });
      });
    });
  });

  describe('GIVEN a // task', () => {
    it('WHEN the boxes are listed THEN the pkg:// box is titled with the root title', () => {
      const title = titleOf(drawingOf([taskOf('//#gen', [])]));

      expect(title).toBe(ROOT_TASKS_TITLE);
    });
  });

  describe('GIVEN a // task and the root label single-app', () => {
    it('WHEN the boxes are listed THEN the box is titled single-app', () => {
      const base = drawingOf([taskOf('//#gen', [])]);
      const drawing: TaskDrawing = { ...base, rootLabel: 'single-app' };

      const title = titleOf(drawing);

      expect(title).toBe('single-app');
    });
  });

  describe('GIVEN an @org/x task labelled x', () => {
    it('WHEN the boxes are listed THEN the box is titled x', () => {
      const naming: TaskNaming = { ...NAMING_STUB, labels: new Map([['@org/x', 'x']]) };
      const base = drawingOf([taskOf('@org/x#build', [])]);
      const drawing: TaskDrawing = { ...base, naming };

      const title = titleOf(drawing);

      expect(title).toBe('x');
    });
  });
});
