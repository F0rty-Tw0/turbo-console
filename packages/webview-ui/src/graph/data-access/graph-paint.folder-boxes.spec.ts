import type { Core, EdgeSingular, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { applyPaint } from './graph-paint.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NORMAL_FOLDER_PAINT } from '../common/paint.const.ts';
import type { Paint } from '../common/paint.type.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
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
