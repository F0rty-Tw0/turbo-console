import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import { ATOM_FILE_CLASS } from '../common/graph-atom.const.ts';
import { TASK_CARD_CLASS } from '../common/graph-card.const.ts';
import { GLYPH_CODE_POINTS } from '../common/graph-glyph.const.ts';
import { RUN_CLASS_PREFIX, RUN_STATE_ICONS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { SELECTED_RING, classedNodeOf, outlineWidthOf, ringOf } from '../test/utils/task-ring.spec.util.ts';

const TASK_ID = 'web#build';
const FILE_ID = 'web#build--a.ts';
const RUNNING = `${RUN_CLASS_PREFIX}running`;

describe('FEATURE: a selected task drops its run outline in graphStyleOf', () => {
  describe('GIVEN a task node and an atom file with the task mode stylesheet', () => {
    let cy: Core;
    let task: NodeSingular;
    let file: NodeSingular;

    beforeEach(() => {
      const taskNode = classedNodeOf(TASK_ID, 'build', `${TASK_NODE_CLASS} ${TASK_CARD_CLASS}`);
      const fileNode = classedNodeOf(FILE_ID, 'a.ts', ATOM_FILE_CLASS);

      cy = cytoscape({ headless: true, styleEnabled: true, elements: [taskNode, fileNode] });
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', true));
      task = cy.getElementById(TASK_ID);
      file = cy.getElementById(FILE_ID);
    });

    afterEach(() => {
      cy.destroy();
    });

    it.each(RUN_STATES)('WHEN the task is selected and classed run-%s THEN no outline and the selected border', (state) => {
      task.addClass(`selected ${RUN_CLASS_PREFIX}${state}`);

      expect(ringOf(task)).toStrictEqual(SELECTED_RING);
    });

    describe('WHEN the task is running and not selected', () => {
      beforeEach(() => {
        task.addClass(RUNNING);
      });

      it('THEN it has no run outline', () => {
        expect(outlineWidthOf(task)).toBe(0);
      });

      it('THEN its bar is the running colour', () => {
        expect(task.style('background-gradient-stop-colors')).toMatch(/^rgb\(255,255,0\)/u);
      });
    });

    it('WHEN the running task is selected then deselected THEN it has no outline and the bar stays running', () => {
      task.addClass(`selected ${RUNNING}`);
      const selectedLook = [outlineWidthOf(task), String(task.style('background-gradient-stop-colors')).split(' ')[0]];

      task.removeClass('selected');

      const deselectedLook = [outlineWidthOf(task), String(task.style('background-gradient-stop-colors')).split(' ')[0]];

      expect([selectedLook, deselectedLook]).toStrictEqual([
        [0, 'rgb(255,255,0)'],
        [0, 'rgb(255,255,0)']
      ]);
    });

    it('WHEN the task is selected with no run class THEN no outline and the selected border', () => {
      task.addClass('selected');

      expect(ringOf(task)).toStrictEqual(SELECTED_RING);
    });

    it('WHEN the atom file is selected and classed run-running THEN it keeps its run outline', () => {
      file.addClass(`selected ${RUNNING}`);

      expect(outlineWidthOf(file)).toBe(2);
    });

    it('WHEN the running task is selected THEN its label still starts with the run-state glyph', () => {
      task.addClass(`selected ${RUNNING}`);

      expect(task.style('label')).toBe(`${GLYPH_CODE_POINTS[RUN_STATE_ICONS.running]} build\nRunning`);
    });
  });
});
