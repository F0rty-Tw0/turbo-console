import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';

import type { GraphEdge, Positions } from '../../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../../common/folder-group.type.ts';
import { setBoxes } from '../../data-access/graph-boxes.ts';
import { positionOf } from '../../data-access/graph-place.ts';
import { graphStyleOf } from '../../data-access/graph-style.ts';
import { edgeIdOf } from '../../utils/edge-id.util.ts';
import { BOARDS_EDGES_STUB, BOARDS_GROUPS_STUB, BOARDS_POSITIONS_STUB, BOARDS_SIZE_STUB } from '../stubs/folder-boards.stub.ts';
import { CANVAS_COLORS } from '../utils/canvas-elements.spec.util.ts';

const packageDefinitionOf = (name: string, positions: Positions): ElementDefinition => {
  const data = { id: name, ...BOARDS_SIZE_STUB };
  const position = positionOf(positions, name);
  const definition: ElementDefinition = { data, position };

  return definition;
};

const edgeDefinitionOf = (edge: GraphEdge): ElementDefinition => {
  const data = { id: edgeIdOf(edge), source: edge.source, target: edge.target };
  const definition: ElementDefinition = { data };

  return definition;
};

/** A headless Cytoscape with the page's stylesheet: the groups' packages at `positions`, inside their boxes, and `edges`. */
export const groupedCyMock = (groups: FolderGroup[], edges: GraphEdge[], positions: Positions): Core => {
  const layout = { name: 'preset', fit: false };
  const names = groups.flatMap((group) => group.packages.map((pkg) => pkg.name));
  const nodes = names.map((name: string): ElementDefinition => packageDefinitionOf(name, positions));
  const links = edges.map(edgeDefinitionOf);
  const elements = [...nodes, ...links];
  const cy = cytoscape({ headless: true, styleEnabled: true, layout, elements });

  cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
  setBoxes(cy, groups);

  return cy;
};

/** The boards fixture drawn grouped, at `BOARDS_POSITIONS_STUB`. */
export const boardsCyMock = (): Core => groupedCyMock(BOARDS_GROUPS_STUB, BOARDS_EDGES_STUB, BOARDS_POSITIONS_STUB);
