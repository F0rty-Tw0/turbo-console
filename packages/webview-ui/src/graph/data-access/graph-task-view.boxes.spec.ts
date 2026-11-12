import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const APPS_ID = folderIdOf('apps');

const LIBS_ID = folderIdOf('libs');

/** `web` sits in the folder `apps`, `ui` in `libs`. */
const GROUPED: TaskNaming = {
  ...NAMING_STUB,
  grouped: true,
  folders: new Map([
    ['web', 'apps'],
    ['ui', 'libs']
  ])
};

/** Each of `web` and `ui` has a turbo task and a script, no link between them. */
const TASKS: GraphTask[] = [taskOf('web#build', []), scriptOf('web#dev', []), taskOf('ui#build', []), scriptOf('ui#dev', [])];

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: {},
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  counts: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: GROUPED
};

const parentIdOf = (cy: Core, id: string): string => cy.getElementById(id).parent().first().id();

const isDimmedBox = (cy: Core, id: string): boolean => cy.getElementById(id).hasClass('dimmed-box');

describe('FEATURE: createTaskCanvas boxes', () => {
  let cy: Core;
  let canvas: TaskCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, layout });
    canvas = createTaskCanvas(cy);
    canvas.show(DRAWING);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN grouped web in apps and ui in libs, each with a turbo task and a script', () => {
    describe('WHEN shown', () => {
      it('THEN pkg:web sits in the apps folder box', () => {
        expect(parentIdOf(cy, 'pkg:web')).toBe(APPS_ID);
      });

      it('THEN the script web#dev sits in scripts:web', () => {
        expect(parentIdOf(cy, 'web#dev')).toBe('scripts:web');
      });

      it('THEN scripts:web sits in pkg:web', () => {
        expect(parentIdOf(cy, 'scripts:web')).toBe('pkg:web');
      });

      it('THEN the turbo task web#build sits in pkg:web', () => {
        expect(parentIdOf(cy, 'web#build')).toBe('pkg:web');
      });
    });

    describe('WHEN web#build is painted', () => {
      beforeEach(() => {
        canvas.paint('web#build');
      });

      it('THEN the libs folder box, with no lit task, is dimmed-box', () => {
        expect(isDimmedBox(cy, LIBS_ID)).toBe(true);
      });

      it('THEN scripts:ui, with no lit task, is dimmed-box', () => {
        expect(isDimmedBox(cy, 'scripts:ui')).toBe(true);
      });

      it('THEN the apps folder box, around the selected task, is not dimmed-box', () => {
        expect(isDimmedBox(cy, APPS_ID)).toBe(false);
      });
    });
  });
});
