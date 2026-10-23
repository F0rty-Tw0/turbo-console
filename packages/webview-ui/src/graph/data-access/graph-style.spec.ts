import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

/** Each run state and its `CANVAS_RUN_COLORS` entry as Cytoscape reports it. */
const RUN_OUTLINES: [GraphRunState, string][] = [
  ['running', 'rgb(255,255,0)'],
  ['passed', 'rgb(0,255,17)'],
  ['failed', 'rgb(255,0,17)'],
  ['stopped', 'rgb(119,119,119)'],
  ['failed-to-start', 'rgb(255,0,34)']
];

const AB = edgeIdOf({ source: 'a', target: 'b' });

const BC = edgeIdOf({ source: 'b', target: 'c' });

describe('FEATURE: graphStyleOf edge states', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the edge a>b has the selected class', () => {
    it('THEN it is 3 wide while a plain edge stays 1', () => {
      cy.getElementById(AB).addClass('selected');

      expect(cy.getElementById(AB).numericStyle('width')).toBe(3);
      expect(cy.getElementById(BC).numericStyle('width')).toBe(1);
    });

    it('THEN its line colour is the selected colour a selected node frames with, not the plain edge colour', () => {
      const edge = cy.getElementById(AB);
      const node = cy.getElementById('a');

      edge.addClass('selected');

      node.addClass('selected');

      expect(edge.style('line-color')).toBe(node.style('border-color'));
      expect(edge.style('line-color')).not.toBe(cy.getElementById(BC).style('line-color'));
    });

    it('THEN its arrow colour is the same selected colour', () => {
      const edge = cy.getElementById(AB);
      const node = cy.getElementById('a');

      edge.addClass('selected');

      node.addClass('selected');

      expect(edge.style('target-arrow-color')).toBe(node.style('border-color'));
    });
  });

  describe('GIVEN the edge b>c has the highlighted class', () => {
    it('THEN it is 2 wide', () => {
      cy.getElementById(BC).addClass('highlighted');

      expect(cy.getElementById(BC).numericStyle('width')).toBe(2);
    });
  });

  describe('GIVEN a node with the highlighted and ghost classes', () => {
    it('THEN its border is dashed and its label is 75% opaque', () => {
      cy.getElementById('a').addClass('highlighted ghost');

      expect(cy.getElementById('a').style('border-style')).toBe('dashed');
      expect(cy.getElementById('a').numericStyle('text-opacity')).toBe(0.75);
    });

    it('THEN it keeps the highlight width and colour and the plain label colour', () => {
      const ghost = cy.getElementById('a');
      const plainHighlight = cy.getElementById('b');
      const plain = cy.getElementById('c');

      ghost.addClass('highlighted ghost');
      plainHighlight.addClass('highlighted');

      expect(ghost.numericStyle('border-width')).toBe(2);
      expect(ghost.style('border-color')).toBe(plainHighlight.style('border-color'));
      expect(ghost.style('color')).toBe(plain.style('color'));
    });
  });

  describe('GIVEN an edge with the highlighted and ghost classes', () => {
    it('THEN its line is dashed and keeps the highlight colour', () => {
      const ghost = cy.getElementById(AB);
      const plainHighlight = cy.getElementById(BC);

      ghost.addClass('highlighted ghost');
      plainHighlight.addClass('highlighted');

      expect(ghost.style('line-style')).toBe('dashed');
      expect(ghost.style('line-color')).toBe(plainHighlight.style('line-color'));
    });
  });

  describe('GIVEN a plain node and a plain edge', () => {
    it('THEN the border and line are solid and the label is fully opaque', () => {
      expect(cy.getElementById('a').style('border-style')).toBe('solid');
      expect(cy.getElementById('a').numericStyle('text-opacity')).toBe(1);
      expect(cy.getElementById(AB).style('line-style')).toBe('solid');
    });
  });

  describe('GIVEN the folder pass classes', () => {
    it('WHEN a node and an edge are folder-hidden THEN both have display none', () => {
      cy.getElementById('a').addClass('folder-hidden');
      cy.getElementById(AB).addClass('folder-hidden');

      expect([cy.getElementById('a').style('display'), cy.getElementById(AB).style('display')]).toStrictEqual(['none', 'none']);
    });

    it('WHEN a node is a folder-node THEN it shows its label data wrapped at 116 px', () => {
      const node = cy.getElementById('a');

      node.data('label', 'apps\n2 packages');
      node.addClass('folder-node');

      expect([node.style('label'), node.style('text-wrap'), node.style('text-max-width')]).toStrictEqual([
        'apps\n2 packages',
        'wrap',
        '116px'
      ]);
    });

    it('WHEN an edge is a folder-link THEN it shows its label on an opaque background of the canvas colour', () => {
      const edge = cy.getElementById(AB);

      edge.data('label', '2 links');
      edge.addClass('folder-link');

      expect([edge.style('label'), edge.numericStyle('text-background-opacity')]).toStrictEqual(['2 links', 1]);
      expect(edge.style('text-background-color')).toBe(cy.getElementById('a').style('background-color'));
    });

    it('WHEN a node is a dimmed-box THEN frame, label and fill are 25% opaque and its opacity stays 1', () => {
      const node = cy.getElementById('a');

      node.addClass('dimmed-box');

      const opacities = [
        node.numericStyle('border-opacity'),
        node.numericStyle('text-opacity'),
        node.numericStyle('background-opacity')
      ];

      expect(opacities).toStrictEqual([0.25, 0.25, 0.25]);
      expect(node.numericStyle('opacity')).toBe(1);
    });
  });
});

describe('FEATURE: graphStyleOf task nodes', () => {
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
