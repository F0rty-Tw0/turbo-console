import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { CardMeasures } from '../common/graph-card.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas, TaskClocks, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { restyledIdsDuring, styleEventsDuring } from '../test/utils/style-events.spec.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const MEASURES: CardMeasures = { regular: (text) => text.length * 7, bold: (text) => text.length * 8 };

/** `web#build` depends on `api#build`; `ui#lint` stands alone. */
const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build']), taskOf('ui#lint', [])];

/** No sizes of their own: all three are plain cards. */
const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: {},
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  counts: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

/** `ui#lint` has a size of its own, so it is drawn as an umbrella, not a card. */
const UMBRELLA_DRAWING: TaskDrawing = { ...DRAWING, sizes: new Map([['ui#lint', NODE_SIZE]]) };

describe('FEATURE: createTaskCanvas clocks', () => {
  let cy: Core;
  let canvas: TaskCanvas;

  const row2Of = (id: string): string | undefined => {
    const rows = String(cy.getElementById(id).style('label')).split('\n');

    return rows[1];
  };
  const clockOf = (id: string): unknown => cy.getElementById(id).data('clock');

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };
    const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', true, MEASURES);

    cy = cytoscape({ headless: true, styleEnabled: true, layout, style });
    canvas = createTaskCanvas(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN three plain cards are shown', () => {
    beforeEach(() => {
      canvas.show(DRAWING);
    });

    it('WHEN clocks names api#build THEN its node data clock is that text', () => {
      canvas.clocks({ 'api#build': '1m 4s' });

      expect(clockOf('api#build')).toBe('1m 4s');
    });

    it('WHEN the card is running THEN row 2 reads Running · 1m 4s; with the id unnamed it reads Running', () => {
      canvas.runStates({ 'api#build': 'running' });
      canvas.clocks({ 'api#build': '1m 4s' });

      expect(row2Of('api#build')).toBe('Running · 1m 4s');

      canvas.clocks({});

      expect(row2Of('api#build')).toBe('Running');
    });

    it('WHEN the run ended while its clock is still named THEN row 2 is Passed', () => {
      canvas.runStates({ 'api#build': 'running' });
      canvas.clocks({ 'api#build': '12s' });
      canvas.runStates({ 'api#build': 'passed' });

      expect(row2Of('api#build')).toBe('Passed');
    });

    it('WHEN clocks drops an id THEN its data is removed (undefined, not an empty string)', () => {
      canvas.clocks({ 'api#build': '1m 4s', 'web#build': '2s' });
      canvas.clocks({ 'web#build': '3s' });

      expect([clockOf('api#build'), clockOf('web#build')]).toStrictEqual([undefined, '3s']);
    });

    it('WHEN the record only inherits the key THEN nothing is written', () => {
      const inherited: TaskClocks = {};

      Reflect.setPrototypeOf(inherited, { 'api#build': '9s' });
      canvas.clocks(inherited);

      expect(clockOf('api#build')).toBeUndefined();
    });

    it('WHEN the same texts come again THEN no element is restyled', () => {
      canvas.clocks({ 'api#build': '1m 4s' });

      expect(styleEventsDuring(cy, (): void => canvas.clocks({ 'api#build': '1m 4s' }))).toBe(0);
    });

    it('WHEN only api#build changes text THEN web#build and ui#lint are not restyled', () => {
      canvas.clocks({ 'api#build': '1m 4s', 'web#build': '2s' });

      const restyled = restyledIdsDuring(cy, (): void => canvas.clocks({ 'api#build': '1m 5s', 'web#build': '2s' }));

      expect(restyled).toContain('api#build');
      expect(restyled).not.toContain('web#build');
      expect(restyled).not.toContain('ui#lint');
    });

    it('WHEN the task graph is shown again THEN the kept clock is on the card at once', () => {
      canvas.runStates({ 'api#build': 'running' });
      canvas.clocks({ 'api#build': '1m 4s' });
      canvas.show(DRAWING);

      expect(row2Of('api#build')).toBe('Running · 1m 4s');
    });

    it('WHEN a node lost its clock data and remark runs THEN the kept clock is written back', () => {
      canvas.clocks({ 'api#build': '1m 4s' });
      cy.getElementById('api#build').removeData('clock');
      canvas.remark();

      expect(clockOf('api#build')).toBe('1m 4s');
    });
  });

  describe('GIVEN ui#lint is drawn as an umbrella', () => {
    beforeEach(() => {
      canvas.show(UMBRELLA_DRAWING);
    });

    it('WHEN clocks names a task that has no card or is an umbrella THEN nothing is written and nothing throws', () => {
      canvas.clocks({ 'ghost#x': '1s', 'ui#lint': '1s' });

      expect(cy.getElementById('ghost#x').empty()).toBe(true);
      expect(clockOf('ui#lint')).toBeUndefined();
    });
  });
});
