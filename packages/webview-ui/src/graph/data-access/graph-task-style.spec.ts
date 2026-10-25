import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

/** Each run state and its `CANVAS_RUN_COLORS` entry as Cytoscape reports it. */
const RUN_OUTLINES: [GraphRunState, string][] = [
  ['running', 'rgb(255,255,0)'],
  ['passed', 'rgb(0,255,17)'],
  ['failed', 'rgb(255,0,17)'],
  ['stopped', 'rgb(119,119,119)'],
  ['failed-to-start', 'rgb(255,0,34)']
];

const TASK_BOX_PLACEMENT = ['web', 'top', 22.5, 'left-inside', -32, 'ellipsis'];

const boxOf = (id: string, title: string): ElementDefinition => {
  const data = { id, title };
  const definition: ElementDefinition = { data, classes: 'task-box' };

  return definition;
};

const childOf = (id: string, parent: string): ElementDefinition => {
  const data = { id, parent };
  const definition: ElementDefinition = { data };

  return definition;
};

const placementOf = (cy: Core, id: string): unknown[] => {
  const box = cy.getElementById(id);
  const placement: unknown[] = [
    box.style('label'),
    box.style('text-valign'),
    box.numericStyle('text-margin-y'),
    box.style('text-halign'),
    box.numericStyle('text-margin-x'),
    box.style('text-wrap')
  ];

  return placement;
};

describe('FEATURE: taskRulesOf task boxes in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const elements = [boxOf('pkg:web', 'web'), childOf('web#build', 'pkg:web')];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a task-box THEN its title sits in the top padding band, left-aligned a padding in, cut with an ellipsis', () => {
    expect(placementOf(cy, 'pkg:web')).toStrictEqual(TASK_BOX_PLACEMENT);
  });

  it('GIVEN a task-box THEN its title is drawn in the label colour', () => {
    expect(cy.getElementById('pkg:web').style('color')).toBe('rgb(238,238,238)');
  });

  it('GIVEN a task-box while exporting THEN it keeps its one left-aligned title', () => {
    cy.getElementById('pkg:web').addClass('exporting');

    expect(placementOf(cy, 'pkg:web')).toStrictEqual(TASK_BOX_PLACEMENT);
  });

  it('GIVEN a task-box with dimmed-box THEN its title fades to 25% with its frame', () => {
    const box = cy.getElementById('pkg:web');

    box.addClass('dimmed-box');

    expect([box.numericStyle('text-opacity'), box.numericStyle('border-opacity')]).toStrictEqual([0.25, 0.25]);
  });
});

const ATOM_OUTLINES: [string, string][] = [
  ['atom-passed', 'rgb(0,255,17)'],
  ['atom-failed', 'rgb(255,0,17)'],
  ['atom-cached', 'rgb(170,0,255)']
];

describe('FEATURE: taskRulesOf Atomizer files and boxes in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const box = boxOf('atom:web#e2e-ci', 'web#e2e-ci');
    const data = { id: 'web#e2e-ci--a b/c.spec.ts', label: 'c.spec.ts', parent: 'atom:web#e2e-ci' };
    const file: ElementDefinition = { data, classes: 'atom-file' };

    const boxElement: ElementDefinition = { ...box, classes: 'atom-box' };
    const elements = [boxElement, file];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN an atom file THEN its label is its data label, cut with an ellipsis at 96 px', () => {
    const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

    expect([file.style('label'), file.style('text-wrap'), file.numericStyle('text-max-width')]).toStrictEqual([
      'c.spec.ts',
      'ellipsis',
      96
    ]);
  });

  it('GIVEN an atom file with no outcome class THEN it has no outline', () => {
    expect(cy.getElementById('web#e2e-ci--a b/c.spec.ts').numericStyle('outline-width')).toBe(0);
  });

  it.each(ATOM_OUTLINES)('GIVEN an atom file classed %s THEN it has a 2 wide outline in %s', (className, rgb) => {
    const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

    file.addClass(className);

    expect(file.numericStyle('outline-width')).toBe(2);
    expect(file.style('outline-color')).toBe(rgb);
  });

  it('GIVEN a failed atom file that is running THEN it shows the 3 wide run outline, not the outcome one', () => {
    const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

    file.addClass('atom-failed run-running');

    expect(file.numericStyle('outline-width')).toBe(3);
    expect(file.style('outline-color')).toBe('rgb(255,255,0)');
  });

  it('GIVEN a live atom file THEN its border is dashed, and a file that is not live keeps a solid one', () => {
    const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

    expect(file.style('border-style')).toBe('solid');

    file.addClass('atom-live');

    expect(file.style('border-style')).toBe('dashed');
  });

  it('GIVEN a live atom file with an outcome THEN its outline is dashed too, so the outline does not hide the dashed border', () => {
    const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

    file.addClass('atom-passed');

    expect(file.style('outline-style')).toBe('solid');

    file.addClass('atom-live');

    expect(file.style('outline-style')).toBe('dashed');
  });

  it('GIVEN an atom box THEN it pads its content 12 px, sizes without its descendants’ labels and draws no label', () => {
    const box = cy.getElementById('atom:web#e2e-ci');

    expect([box.numericStyle('padding'), box.style('compound-sizing-wrt-labels'), box.style('label')]).toStrictEqual([
      12,
      'exclude',
      ''
    ]);
  });
});

describe('FEATURE: taskRulesOf task nodes in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const data = { id: 'web#build', label: 'build' };
    const task: ElementDefinition = { data, classes: 'task' };

    cy = cytoscape({ headless: true, styleEnabled: true, elements: [task] });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a task node THEN its label is the task name, not its id', () => {
    expect(cy.getElementById('web#build').style('label')).toBe('build');
  });

  it('GIVEN a plain task THEN its label does not wrap', () => {
    expect(cy.getElementById('web#build').style('text-wrap')).not.toBe('wrap');
  });

  it('GIVEN an umbrella node THEN its label wraps so the counts line sits under the name', () => {
    const node = cy.getElementById('web#build');

    node.addClass('atom-umbrella');

    expect(node.style('text-wrap')).toBe('wrap');
  });

  it('GIVEN a task with no run class THEN it has no outline', () => {
    expect(cy.getElementById('web#build').numericStyle('outline-width')).toBe(0);
  });

  it.each(RUN_OUTLINES)('GIVEN a task classed run-%s THEN it has a 3 wide outline 2 out in %s', (state, rgb) => {
    const node = cy.getElementById('web#build');

    node.addClass(`run-${state}`);

    expect(node.numericStyle('outline-width')).toBe(3);
    expect(node.numericStyle('outline-offset')).toBe(2);
    expect(node.style('outline-color')).toBe(rgb);
  });
});
