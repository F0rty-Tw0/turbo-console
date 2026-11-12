import cytoscape from 'cytoscape';
import type { Core, EdgeDataDefinition, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { TASK_LINK_CLASS } from '../common/graph-task.const.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const LINK_DATA: EdgeDataDefinition = { id: 'link', source: 'a', target: 'b' };

const OPEN_DATA: EdgeDataDefinition = { id: 'open', source: 'a', target: 'c', srcEnd: '0px 100px' };

const PACKAGE_DATA: EdgeDataDefinition = { id: 'package', source: 'b', target: 'c' };

const ELEMENTS: ElementDefinition[] = [
  canvasNodeOf('a'),
  canvasNodeOf('b'),
  canvasNodeOf('c'),
  { data: LINK_DATA, classes: TASK_LINK_CLASS },
  { data: OPEN_DATA, classes: TASK_LINK_CLASS },
  { data: PACKAGE_DATA }
];

const styleOf = (cy: Core, id: string, name: string): unknown => cy.getElementById(id).style(name);

describe('FEATURE: routeRulesOf task links in the graph stylesheet', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a task link', () => {
    it('WHEN styled THEN curve-style is straight', () => {
      expect(styleOf(cy, 'link', 'curve-style')).toBe('straight');
    });

    it('WHEN styled THEN it leaves its source at the node border', () => {
      expect(styleOf(cy, 'link', 'source-endpoint')).toBe('outside-to-node');
    });

    it('WHEN styled THEN it is drawn under every box', () => {
      expect(styleOf(cy, 'link', 'z-compound-depth')).toBe('bottom');
    });

    it('WHEN selected THEN it stays straight', () => {
      cy.getElementById('link').addClass('selected');

      expect(styleOf(cy, 'link', 'curve-style')).toBe('straight');
    });
  });

  describe('GIVEN a task link out of an open umbrella, its source end in its data', () => {
    it('WHEN styled THEN it is straight from that end', () => {
      const drawn = [styleOf(cy, 'open', 'curve-style'), styleOf(cy, 'open', 'source-endpoint')];

      expect(drawn).toStrictEqual(['straight', '0px 100px']);
    });
  });

  describe('GIVEN a package edge', () => {
    it('WHEN styled THEN curve-style stays bezier', () => {
      expect(styleOf(cy, 'package', 'curve-style')).toBe('bezier');
    });

    it('WHEN styled THEN it keeps the compound draw order', () => {
      expect(styleOf(cy, 'package', 'z-compound-depth')).toBe('auto');
    });
  });
});
