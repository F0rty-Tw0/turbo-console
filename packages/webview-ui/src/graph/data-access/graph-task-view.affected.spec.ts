import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphAffectedMark } from '../../bridge/common/graph-affected.type.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { AFFECTED_CLASS_PREFIX, BOX_FRAMED_CLASS, NO_AFFECTED } from '../common/graph-task.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskAffectedMarks, TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const FRAMED_SELECTOR = `.${BOX_FRAMED_CLASS}`;

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const TASKS: GraphTask[] = [taskOf('app#build', ['lib#build']), taskOf('lib#build', []), taskOf('ui#build', [])];

const APP_AT: Position = { x: 10, y: 20 };

const LIB_AT: Position = { x: 10, y: 120 };

const UI_AT: Position = { x: 200, y: 20 };

const POSITIONS: Positions = { 'app#build': APP_AT, 'lib#build': LIB_AT, 'ui#build': UI_AT };

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: POSITIONS,
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  counts: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

const TWO_MARKED: TaskAffectedMarks = { 'app#build': 'changed', 'lib#build': 'dependency' };

const isAffectedClass = (name: string): boolean => name.startsWith(AFFECTED_CLASS_PREFIX);

const affectedClassesOf = (cy: Core, id: string): string[] => {
  const classes = cy.getElementById(id).classes();

  return classes.filter(isAffectedClass);
};

const affectedCountOf = (cy: Core): number => cy.elements('.affected-changed, .affected-dependency').length;

describe('FEATURE: task canvas affected marks', () => {
  let cy: Core;
  let canvas: TaskCanvas;

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN three drawn tasks', () => {
    beforeEach(() => {
      const layout = { name: 'preset', fit: false };

      cy = cytoscape({ headless: true, layout });
      canvas = createTaskCanvas(cy);
      canvas.show(DRAWING);
    });

    describe('WHEN affected marks two tasks', () => {
      it('THEN the changed task carries affected-changed', () => {
        canvas.affected(TWO_MARKED);

        expect(affectedClassesOf(cy, 'app#build')).toStrictEqual(['affected-changed']);
      });

      it('THEN the dependency task carries affected-dependency', () => {
        canvas.affected(TWO_MARKED);

        expect(affectedClassesOf(cy, 'lib#build')).toStrictEqual(['affected-dependency']);
      });

      it('THEN the third task carries none', () => {
        canvas.affected(TWO_MARKED);

        expect(affectedClassesOf(cy, 'ui#build')).toStrictEqual([]);
      });
    });

    describe('WHEN a second record marks only ui#build', () => {
      it('THEN the first two lose their classes', () => {
        canvas.affected(TWO_MARKED);
        canvas.affected({ 'ui#build': 'changed' });

        expect(affectedCountOf(cy)).toBe(1);
      });

      it('THEN ui#build carries its class', () => {
        canvas.affected(TWO_MARKED);
        canvas.affected({ 'ui#build': 'changed' });

        expect(affectedClassesOf(cy, 'ui#build')).toStrictEqual(['affected-changed']);
      });
    });

    it('WHEN NO_AFFECTED follows a record THEN every affected class is gone', () => {
      canvas.affected(TWO_MARKED);
      canvas.affected(NO_AFFECTED);

      expect(affectedCountOf(cy)).toBe(0);
    });

    it('WHEN the record names a task that is not drawn THEN no element carries an affected class', () => {
      canvas.affected({ 'gone#x': 'changed' });

      expect(affectedCountOf(cy)).toBe(0);
    });

    it('WHEN the record only inherits a drawn id THEN no element carries an affected class', () => {
      const inherited: TaskAffectedMarks = {};

      Reflect.setPrototypeOf(inherited, TWO_MARKED);
      canvas.affected(inherited);

      expect(affectedCountOf(cy)).toBe(0);
    });

    it('WHEN the tasks are shown again THEN the kept marks are set again', () => {
      canvas.affected(TWO_MARKED);
      canvas.show(DRAWING);

      expect(affectedClassesOf(cy, 'app#build')).toStrictEqual(['affected-changed']);
    });

    it('WHEN remark runs after a class was dropped THEN the kept marks are set again', () => {
      canvas.affected(TWO_MARKED);
      cy.getElementById('lib#build').removeClass('affected-dependency');
      canvas.remark();

      expect(affectedClassesOf(cy, 'lib#build')).toStrictEqual(['affected-dependency']);
    });

    it('WHEN the marks change THEN the box frames are not refit', () => {
      const nodesSpy = vi.spyOn(cy, 'nodes');

      canvas.affected(TWO_MARKED);

      expect(nodesSpy).not.toHaveBeenCalledWith(FRAMED_SELECTOR);
    });

    it('WHEN a run state and a mark are both set THEN both classes are kept on the node', () => {
      canvas.runStates({ 'app#build': 'running' });
      canvas.affected(TWO_MARKED);

      const node = cy.getElementById('app#build');

      expect([node.hasClass('run-running'), node.hasClass('affected-changed')]).toStrictEqual([true, true]);
    });
  });

  describe('GIVEN three drawn tasks marked with one record', () => {
    const record: TaskAffectedMarks = { 'app#build': 'changed' };

    beforeEach(() => {
      cy = cytoscape({ headless: true });
      canvas = createTaskCanvas(cy);
      canvas.show(DRAWING);
      canvas.affected(record);
    });

    it('WHEN the same record comes again THEN no class changes', () => {
      const onClass = vi.fn<() => void>();

      cy.on('class', onClass);
      canvas.affected(record);

      expect(onClass).not.toHaveBeenCalled();
    });

    it('WHEN the same record comes again THEN no node is read', () => {
      const nodesSpy = vi.spyOn(cy, 'nodes');

      canvas.affected(record);

      expect(nodesSpy).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a drawn task whose id is a key every object inherits', () => {
    beforeEach(() => {
      const tasks = [taskOf('toString', [])];
      const drawing: TaskDrawing = { ...DRAWING, tasks };

      cy = cytoscape({ headless: true });
      canvas = createTaskCanvas(cy);
      canvas.show(drawing);
    });

    it('WHEN the record does not name it THEN that task carries no affected class', () => {
      const marked = Object.fromEntries<GraphAffectedMark>([['toString', 'changed']]);

      canvas.affected(marked);
      canvas.affected(NO_AFFECTED);

      expect(affectedClassesOf(cy, 'toString')).toStrictEqual([]);
    });
  });
});
