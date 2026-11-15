import cytoscape from 'cytoscape';
import type { Core, EdgeDataDefinition, ElementDefinition, StylesheetJsonBlock } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { TASK_LINK_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_LINK_CLASS } from '../common/graph.const.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const OLD_ROUTED_CLASS = 'routed';

const SEGMENT_DATA = { segWeights: [0.25, 0.75], segDistances: [-40, -40], srcEnd: '0px 16px', tgtEnd: '0px -16px' };

const ROUTED_DATA: EdgeDataDefinition = { id: 'routed', source: 'a', target: 'b', ...SEGMENT_DATA };

const PLAIN_DATA: EdgeDataDefinition = { id: 'plain', source: 'b', target: 'c' };

const OFFSET_DATA: EdgeDataDefinition = { id: 'offset', source: 'a', target: 'c', labelDx: 24, labelDy: -3 };

const ELEMENTS: ElementDefinition[] = [
  canvasNodeOf('a'),
  canvasNodeOf('b'),
  canvasNodeOf('c'),
  { data: ROUTED_DATA, classes: OLD_ROUTED_CLASS },
  { data: PLAIN_DATA },
  { data: OFFSET_DATA, classes: FOLDER_LINK_CLASS }
];

const styleOf = (cy: Core, id: string, name: string): unknown => cy.getElementById(id).style(name);

const selectorOf = (block: StylesheetJsonBlock): string => block.selector;

const isRoutedSelector = (selector: string): boolean => selector.includes(`.${OLD_ROUTED_CLASS}`);

const cssOf = (block: StylesheetJsonBlock): object => ('style' in block ? block.style : block.css);

const depthOf = (block: StylesheetJsonBlock): unknown => {
  const properties = new Map<string, unknown>(Object.entries(cssOf(block)));

  return properties.get('z-compound-depth');
};

const setsDepth = (block: StylesheetJsonBlock): boolean => depthOf(block) !== undefined;

const depthRuleOf = (block: StylesheetJsonBlock): string => `${block.selector} ${String(depthOf(block))}`;

describe('FEATURE: the base edge rule and routeRulesOf in the graph stylesheet', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a plain package edge', () => {
    it('WHEN styled THEN curve-style is bezier', () => {
      expect(styleOf(cy, 'plain', 'curve-style')).toBe('bezier');
    });

    it('WHEN styled THEN it keeps the compound draw order, over every folder box', () => {
      expect(styleOf(cy, 'plain', 'z-compound-depth')).toBe('auto');
    });

    it('WHEN selected THEN it stays a bezier in the compound draw order', () => {
      cy.getElementById('plain').addClass('selected');

      const drawn = [styleOf(cy, 'plain', 'curve-style'), styleOf(cy, 'plain', 'z-compound-depth')];

      expect(drawn).toStrictEqual(['bezier', 'auto']);
    });
  });

  describe('GIVEN a folder link', () => {
    it('WHEN styled THEN it is a bezier in the compound draw order', () => {
      const drawn = [styleOf(cy, 'offset', 'curve-style'), styleOf(cy, 'offset', 'z-compound-depth')];

      expect(drawn).toStrictEqual(['bezier', 'auto']);
    });
  });

  describe('GIVEN an edge with the old routed class and segment data', () => {
    it('WHEN styled THEN curve-style stays bezier', () => {
      expect(styleOf(cy, 'routed', 'curve-style')).toBe('bezier');
    });
  });

  describe('GIVEN the whole stylesheet', () => {
    it('WHEN its selectors are read THEN none selects the routed class', () => {
      const selectors = graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB).map(selectorOf);

      expect(selectors.filter(isRoutedSelector)).toStrictEqual([]);
    });

    it('WHEN its rules are read THEN only the task link rule sets z-compound-depth, to bottom', () => {
      const depthRules = graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB).filter(setsDepth).map(depthRuleOf);

      expect(depthRules).toStrictEqual([`edge.${TASK_LINK_CLASS} bottom`]);
    });
  });

  describe('GIVEN a folder link with a label offset in its data', () => {
    it('WHEN styled THEN its label margins are the data offsets', () => {
      const edge = cy.getElementById('offset');

      const margins: unknown[] = [edge.style('text-margin-x'), edge.style('text-margin-y')];

      expect(margins).toStrictEqual(['24px', '-3px']);
    });
  });
});
