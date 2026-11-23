import type { Core, EdgeCollection, EdgeSingular, NodeCollection, NodeSingular } from 'cytoscape';

import type { FolderGroup } from '../common/folder-group.type.ts';
import { EDGE_ID_PREFIX } from '../common/graph.const.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { folderIdOf, isPackageId } from '../utils/folder-id.util.ts';

const isPackageNode = (node: NodeSingular): boolean => isPackageId(node.id());

const isBoxNode = (node: NodeSingular): boolean => !isPackageNode(node);

/** The nodes that are packages; every walker uses this so a folder box is never placed, hidden, classed or posted. */
export const packageNodes = (cy: Core): NodeCollection => cy.nodes().filter(isPackageNode);

const isPackageEdge = (edge: EdgeSingular): boolean => edge.id().startsWith(EDGE_ID_PREFIX);

/** The package links; folder links are drawn by the folder pass and never painted, ghosted or probed as links. */
export const packageEdges = (cy: Core): EdgeCollection => cy.edges().filter(isPackageEdge);

const clearBoxes = (cy: Core): void => {
  const boxes = cy.nodes().filter(isBoxNode);
  const isFlat = boxes.empty();

  if (isFlat) return;

  packageNodes(cy).move({ parent: null });
  boxes.remove();
};

/** Moves the group's drawn packages in one call: each `move` rescans the whole graph for compound nodes. */
const fillBox = (cy: Core, group: FolderGroup): void => {
  const parent = folderIdOf(group.folder);

  const data = { id: parent, title: folderTitleOf(group.folder) };

  cy.add({ data });

  const drawn = cy.collection();

  for (const { name } of group.packages) drawn.merge(cy.getElementById(name));

  drawn.move({ parent });
};

/** Replaces the folder boxes: one compound per group holding its packages, or none for `null`; no position changes. */
export const setBoxes = (cy: Core, groups: FolderGroup[] | null): void => {
  cy.batch((): void => {
    clearBoxes(cy);

    for (const group of groups ?? []) fillBox(cy, group);
  });
};
