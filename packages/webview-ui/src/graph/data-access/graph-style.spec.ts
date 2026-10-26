import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import {
  EDGE_WIDTH,
  FOLDER_NODE_CLASS,
  HIGHLIGHTED_EDGE_WIDTH,
  NODE_BORDER_PX,
  SELECTED_BORDER_PX,
  SELECTED_EDGE_WIDTH
} from '../common/graph.const.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS, canvasEdgeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const AB = edgeIdOf({ source: 'a', target: 'b' });

const BC = edgeIdOf({ source: 'b', target: 'c' });

describe('FEATURE: graphStyleOf edge states', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the edge a>b has the selected class', () => {
    it('THEN it is 1.5 wide while a plain edge stays 0.75', () => {
      cy.getElementById(AB).addClass('selected');

      expect(cy.getElementById(AB).numericStyle('width')).toBe(1.5);
      expect(cy.getElementById(BC).numericStyle('width')).toBe(0.75);
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
    it('THEN it is 1.25 wide', () => {
      cy.getElementById(BC).addClass('highlighted');

      expect(cy.getElementById(BC).numericStyle('width')).toBe(1.25);
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

      expect(ghost.numericStyle('border-width')).toBe(1);
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

const FOLDER_BOX_DATA = { id: 'folder:apps', title: 'apps' };

const FOLDER_BOX: ElementDefinition = { data: FOLDER_BOX_DATA };

const FOLDER_CHILD_DATA = { id: 'site', parent: 'folder:apps' };

const FOLDER_CHILD: ElementDefinition = { data: FOLDER_CHILD_DATA };

describe('FEATURE: graphStyleOf folder boxes', () => {
  let cy: Core;

  beforeEach(() => {
    const elements = [FOLDER_BOX, FOLDER_CHILD];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a folder box THEN it shows no label on the page', () => {
    expect(cy.getElementById('folder:apps').style('label')).toBe('');
  });

  it('GIVEN a folder box while exporting THEN its title is centred in the top padding band', () => {
    const box = cy.getElementById('folder:apps');

    box.addClass('exporting');

    const placement = [
      box.style('label'),
      box.style('text-halign'),
      box.numericStyle('text-margin-x'),
      box.numericStyle('text-margin-y')
    ];

    expect(placement).toStrictEqual(['apps', 'center', 0, 22.5]);
  });
});

/** A high contrast theme's raised dim, which no 0.25 default could stand in for. */
const RAISED_DIM_COLORS = { ...CANVAS_COLORS, dimmedOpacity: 0.55 };

describe('FEATURE: graphStyleOf dimmed opacity', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    cy.style(graphStyleOf(RAISED_DIM_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN colours with a 0.55 dim WHEN a node and an edge are dimmed THEN both are 0.55 opaque', () => {
    const node = cy.getElementById('a');
    const edge = cy.getElementById(AB);

    node.addClass('dimmed');
    edge.addClass('dimmed');

    expect([node.numericStyle('opacity'), edge.numericStyle('opacity')]).toStrictEqual([0.55, 0.55]);
  });

  it('GIVEN colours with a 0.55 dim WHEN a node is a dimmed-box THEN its frame, label and fill are 0.55 opaque', () => {
    const node = cy.getElementById('a');

    node.addClass('dimmed-box');

    const opacities = [
      node.numericStyle('border-opacity'),
      node.numericStyle('text-opacity'),
      node.numericStyle('background-opacity')
    ];

    expect(opacities).toStrictEqual([0.55, 0.55, 0.55]);
  });
});

const THEMED_COLORS = { ...CANVAS_COLORS, selected: '#00f' };

describe('FEATURE: graphStyleOf corners and arrows', () => {
  let cy: Core;

  beforeEach(() => {
    const elements = [...CANVAS_ELEMENTS, FOLDER_BOX, FOLDER_CHILD];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a plain package node THEN its corners are 6 px round', () => {
    expect(cy.getElementById('a').numericStyle('corner-radius')).toBe(6);
  });

  it('GIVEN a node with packages THEN its corners are 8 px round', () => {
    expect(cy.getElementById('folder:apps').numericStyle('corner-radius')).toBe(8);
  });

  it('GIVEN a collapsed folder node THEN its corners are 8 px round', () => {
    const node = cy.getElementById('a');

    node.addClass(FOLDER_NODE_CLASS);

    expect(node.numericStyle('corner-radius')).toBe(8);
  });

  it('GIVEN a ghost node THEN its corners stay 6 px round', () => {
    const node = cy.getElementById('a');

    node.addClass('ghost');

    expect(node.numericStyle('corner-radius')).toBe(6);
  });

  it.each(['', 'highlighted', 'selected'])(
    'GIVEN an edge classed "%s" THEN its arrow is 0.8 scaled and 3 px clear of the node',
    (className) => {
      const edge = cy.getElementById(AB);

      edge.addClass(className);

      expect([edge.numericStyle('arrow-scale'), edge.numericStyle('target-distance-from-node')]).toStrictEqual([0.8, 3]);
    }
  );

  it('GIVEN an edge in each state THEN plain is 0.75, highlighted 1.25, selected 1.5 and the arrow scale stays 0.8', () => {
    cy.add(canvasEdgeOf('c', 'a'));
    const plain = cy.getElementById(AB);
    const lit = cy.getElementById(BC);
    const picked = cy.getElementById(edgeIdOf({ source: 'c', target: 'a' }));

    lit.addClass('highlighted');
    picked.addClass('selected');

    expect([plain.numericStyle('width'), lit.numericStyle('width'), picked.numericStyle('width')]).toStrictEqual([
      EDGE_WIDTH,
      HIGHLIGHTED_EDGE_WIDTH,
      SELECTED_EDGE_WIDTH
    ]);
    expect([EDGE_WIDTH, HIGHLIGHTED_EDGE_WIDTH, SELECTED_EDGE_WIDTH]).toStrictEqual([0.75, 1.25, 1.5]);
    expect(plain.numericStyle('arrow-scale')).toBe(0.8);
  });

  it('GIVEN a selected node THEN its border is 1.5 and a plain node keeps 1', () => {
    const picked = cy.getElementById('a');
    const plain = cy.getElementById('b');

    picked.addClass('selected');

    expect([picked.numericStyle('border-width'), plain.numericStyle('border-width')]).toStrictEqual([
      SELECTED_BORDER_PX,
      NODE_BORDER_PX
    ]);
    expect([SELECTED_BORDER_PX, NODE_BORDER_PX]).toStrictEqual([1.5, 1]);
  });

  it('GIVEN another theme applied again THEN the corners and the selected width are unchanged', () => {
    const node = cy.getElementById('a');
    const edge = cy.getElementById(AB);

    cy.style(graphStyleOf(THEMED_COLORS, 'sans-serif', false));
    node.addClass('selected');
    edge.addClass('selected');

    expect([node.numericStyle('corner-radius'), node.numericStyle('border-width'), edge.numericStyle('width')]).toStrictEqual([
      6, 1.5, 1.5
    ]);
  });
});
