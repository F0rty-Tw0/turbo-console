import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import { ATOM_FILE_CLASS } from '../common/graph-atom.const.ts';
import { GLYPH_CODE_POINTS } from '../common/graph-glyph.const.ts';
import { RUN_CLASS_PREFIX, RUN_STATE_ICONS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const TASK_ID = 'web#build';
const FILE_ID = 'web#build--a.ts';
const RUNNING = `${RUN_CLASS_PREFIX}running`;
const SELECTED_RING = [0, 2, 'rgb(255,0,0)'];

const nodeOf = (id: string, label: string, classes: string): ElementDefinition => {
  const data = { id, label };
  const definition: ElementDefinition = { data, classes };

  return definition;
};

const outlineWidthOf = (node: NodeSingular): number => Number(node.numericStyle('outline-width'));

/** The outline width, then the border width and colour, as Cytoscape reports them. */
const ringOf = (node: NodeSingular): unknown[] => {
  const ring: unknown[] = [outlineWidthOf(node), node.numericStyle('border-width'), node.style('border-color')];

  return ring;
};

describe('FEATURE: a selected task drops its run outline in graphStyleOf', () => {
  let cy: Core;
  let task: NodeSingular;
  let file: NodeSingular;

  beforeEach(() => {
    const elements = [nodeOf(TASK_ID, 'build', TASK_NODE_CLASS), nodeOf(FILE_ID, 'a.ts', ATOM_FILE_CLASS)];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', true));
    task = cy.getElementById(TASK_ID);
    file = cy.getElementById(FILE_ID);
  });

  afterEach(() => {
    cy.destroy();
  });

  it.each(RUN_STATES)('GIVEN a selected task classed run-%s THEN no outline and the 2 wide selected border', (state) => {
    task.addClass(`selected ${RUN_CLASS_PREFIX}${state}`);

    expect(ringOf(task)).toStrictEqual(SELECTED_RING);
  });

  it('GIVEN a running task not selected THEN it keeps the 2 wide run outline', () => {
    task.addClass(RUNNING);

    expect([outlineWidthOf(task), task.style('outline-color')]).toStrictEqual([2, 'rgb(255,255,0)']);
  });

  it('GIVEN a running task selected then deselected THEN the outline returns', () => {
    task.addClass(`selected ${RUNNING}`);
    task.removeClass('selected');

    expect(outlineWidthOf(task)).toBe(2);
  });

  it('GIVEN a selected task with no run class THEN no outline and the selected border', () => {
    task.addClass('selected');

    expect(ringOf(task)).toStrictEqual(SELECTED_RING);
  });

  it('GIVEN a selected atom file classed run-running THEN it keeps its run outline', () => {
    file.addClass(`selected ${RUNNING}`);

    expect(outlineWidthOf(file)).toBe(2);
  });

  it('GIVEN a selected running task THEN its label still starts with the run-state glyph', () => {
    task.addClass(`selected ${RUNNING}`);

    expect(task.style('label')).toBe(`${GLYPH_CODE_POINTS[RUN_STATE_ICONS.running]} build`);
  });
});
