import type { Core, ElementDefinition } from 'cytoscape';

import { positionOf } from './graph-place.ts';
import type { GraphEdge, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphView, NodeSizer } from '../common/graph-page.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { labelledSizeOf } from '../utils/package-label.util.ts';

type PackageWriters = Pick<GraphView, 'setGraph' | 'setLabels'>;

const nodeDefinitionsOf = (packages: string[], positions: Positions, sizeOf: NodeSizer): ElementDefinition[] => {
  const definitionOf = (name: string): ElementDefinition => {
    const { width, height } = sizeOf(name);
    const data = { id: name, label: name, width, height };
    const position = positionOf(positions, name);
    const definition: ElementDefinition = { data, position };

    return definition;
  };

  return packages.map(definitionOf);
};

const edgeDefinitionOf = (edge: GraphEdge): ElementDefinition => {
  const data = { id: edgeIdOf(edge), source: edge.source, target: edge.target };
  const definition: ElementDefinition = { data };

  return definition;
};

const drawGraph = (cy: Core, nodes: ElementDefinition[], edges: GraphEdge[]): void => {
  const links = edges.map(edgeDefinitionOf);

  cy.resize();
  cy.elements().remove();
  cy.add([...nodes, ...links]);
};

/**
 * Writes each named package node's label and its `labelledSizeOf` box; a name not drawn is skipped. Only the named nodes
 * are touched, never `cy.nodes()`, so a collapsed folder keeps its own label.
 */
export const labelPackages = (cy: Core, labels: ReadonlyMap<string, string>, sizeOf: NodeSizer): void => {
  const relabel = (): void => {
    for (const [name, label] of labels) {
      const { width, height } = labelledSizeOf(name, label, sizeOf);

      cy.getElementById(name).data({ label, width, height });
    }
  };

  cy.batch(relabel);
};

/** The view's package writers: `setGraph` draws and keeps its sizer, so a later `setLabels` sizes each node for its label. */
export const packageWritersOf = (cy: Core): PackageWriters => {
  let packageSizeOf: NodeSizer | null = null;
  const setGraph = (packages: string[], edges: GraphEdge[], placed: Positions, sizeOf: NodeSizer): void => {
    const nodes = nodeDefinitionsOf(packages, placed, sizeOf);

    packageSizeOf = sizeOf;
    drawGraph(cy, nodes, edges);
  };
  const setLabels = (labels: ReadonlyMap<string, string>): void => {
    if (packageSizeOf !== null) labelPackages(cy, labels, packageSizeOf);
  };
  const writers: PackageWriters = { setGraph, setLabels };

  return writers;
};
