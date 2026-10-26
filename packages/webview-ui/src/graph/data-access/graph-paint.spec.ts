import cytoscape from 'cytoscape';
import type { Core, EdgeSingular, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { applyPaint } from './graph-paint.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NORMAL_FOLDER_PAINT } from '../common/paint.const.ts';
import type { Paint } from '../common/paint.type.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { folderLinkIdOf } from '../utils/folder-id.util.ts';

const NODE_STATES = new Map<string, ProbeState>([
  ['a', 'selected'],
  ['b', 'highlighted'],
  ['c', 'dimmed'],
  ['__proto__', 'normal']
]);

const paintOfStates = (nodeState: (name: string) => ProbeState, edgeState: (edge: GraphEdge) => ProbeState): Paint => {
  const paint: Paint = { nodeState, edgeState, ...NORMAL_FOLDER_PAINT };

  return paint;
};

const stateOfName = (name: string): ProbeState => NODE_STATES.get(name) ?? 'normal';

const FIRST_PAINT: Paint = paintOfStates(stateOfName, (): ProbeState => 'normal');

const uniformPaint = (state: ProbeState): Paint => {
  return paintOfStates(
    (): ProbeState => state,
    (): ProbeState => state
  );
};

const classesOf = (element: NodeSingular | EdgeSingular): string[] => element.classes();

describe('FEATURE: applyPaint', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a paint that gives each package a state', () => {
    it('WHEN it is applied THEN each node has exactly that state class', () => {
      applyPaint(cy, FIRST_PAINT);

      const ids = ['a', 'b', 'c', '__proto__'];
      const classes = ids.map((id: string): string[] => classesOf(cy.getElementById(id)));

      expect(classes).toStrictEqual([['selected'], ['highlighted'], ['dimmed'], ['normal']]);
    });

    it('WHEN it is applied a second time THEN no class event fires, so no package or link is restyled', () => {
      let classEvents = 0;

      applyPaint(cy, FIRST_PAINT);
      cy.on('class', (): void => {
        classEvents += 1;
      });

      applyPaint(cy, FIRST_PAINT);

      expect(classEvents).toBe(0);
    });

    it('WHEN it is applied THEN the selected style still applies to the node', () => {
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));

      applyPaint(cy, FIRST_PAINT);

      expect(cy.getElementById('a').numericStyle('border-width')).toBe(2);
    });
  });

  describe('GIVEN an edge paint that selects a>b', () => {
    it('WHEN it is applied THEN each edge is asked with its ends and gets its state class', () => {
      const edgeState = vi.fn((edge: GraphEdge): ProbeState => (edge.source === 'a' ? 'selected' : 'dimmed'));

      applyPaint(cy, paintOfStates(stateOfName, edgeState));

      const ab = cy.getElementById(edgeIdOf({ source: 'a', target: 'b' }));
      const bc = cy.getElementById(edgeIdOf({ source: 'b', target: 'c' }));

      expect(edgeState).toHaveBeenCalledWith({ source: 'a', target: 'b' });
      expect(edgeState).toHaveBeenCalledWith({ source: 'b', target: 'c' });
      expect([classesOf(ab), classesOf(bc)]).toStrictEqual([['selected'], ['dimmed']]);
    });
  });

  describe('GIVEN everything painted dimmed', () => {
    it('WHEN a second paint makes everything normal THEN no element keeps the dimmed class', () => {
      applyPaint(cy, uniformPaint('dimmed'));

      applyPaint(cy, uniformPaint('normal'));

      const classes = cy.elements().map(classesOf);
      const expected = classes.map((): string[] => ['normal']);

      expect(classes).toStrictEqual(expected);
    });
  });

  describe('GIVEN node a carries the ghost class', () => {
    it('WHEN it is painted selected then normal THEN ghost survives both paints', () => {
      const node = cy.getElementById('a');

      node.addClass('ghost');

      applyPaint(cy, uniformPaint('selected'));
      const selected = classesOf(node).sort();

      applyPaint(cy, uniformPaint('normal'));
      const normal = classesOf(node).sort();

      expect([selected, normal]).toStrictEqual([
        ['ghost', 'selected'],
        ['ghost', 'normal']
      ]);
    });
  });
});

const PAINTED_IDS = ['a', 'b', 'c', '__proto__'];

describe('FEATURE: applyPaint with folder boxes', () => {
  let cy: Core;

  beforeEach(() => {
    cy = boxedCyMock();
    setBoxes(cy, BOX_GROUPS_STUB);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a paint that gives each package a state', () => {
    it('WHEN it is applied THEN every box has no state class', () => {
      applyPaint(cy, FIRST_PAINT);

      const boxes = cy.nodes(':parent');
      const classes = boxes.map(classesOf);

      expect(classes).toStrictEqual([[], [], []]);
    });

    it('WHEN it is applied THEN the packages and links still get their classes', () => {
      applyPaint(cy, FIRST_PAINT);

      const nodeClasses = PAINTED_IDS.map((id: string): string[] => classesOf(cy.getElementById(id)));
      const links = cy.edges();
      const linkClasses = links.map(classesOf);

      expect(nodeClasses).toStrictEqual([['selected'], ['highlighted'], ['dimmed'], ['normal']]);
      expect(linkClasses).toStrictEqual([['normal'], ['normal']]);
    });
  });

  describe('GIVEN a folder link between a and c', () => {
    beforeEach(() => {
      const data = { id: folderLinkIdOf('a', 'c'), source: 'a', target: 'c' };

      cy.add({ data, classes: 'folder-link' });
    });

    it('WHEN a selected paint is applied THEN the folder link gets no package-edge class', () => {
      applyPaint(cy, uniformPaint('selected'));

      expect(classesOf(cy.getElementById(folderLinkIdOf('a', 'c')))).toStrictEqual(['folder-link']);
    });

    it('WHEN a paint is applied THEN the edge state is asked for the two package links only', () => {
      const edgeState = vi.fn((): ProbeState => 'normal');

      applyPaint(cy, paintOfStates(stateOfName, edgeState));

      expect(edgeState).toHaveBeenCalledTimes(2);
    });
  });
});
