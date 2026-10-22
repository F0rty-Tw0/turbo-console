import type { Core, NodeCollection, NodeSingular } from 'cytoscape';

import type { FolderGroup } from '../common/folder-group.type.ts';
import { folderIdOf, isPackageId } from '../utils/folder-id.util.ts';

const isPackageNode = (node: NodeSingular): boolean => isPackageId(node.id());

const isBoxNode = (node: NodeSingular): boolean => !isPackageNode(node);

/** The nodes that are packages; every walker uses this so a folder box is never placed, hidden, classed or posted. */
export const packageNodes = (cy: Core): NodeCollection => cy.nodes().filter(isPackageNode);

const clearBoxes = (cy: Core): void => {
  packageNodes(cy).move({ parent: null });
  cy.nodes().filter(isBoxNode).remove();
};

const fillBox = (cy: Core, group: FolderGroup): void => {
  const parent = folderIdOf(group.folder);

  const data = { id: parent };

  cy.add({ data });

  for (const { name } of group.packages) {
    const node = cy.getElementById(name);
    const isDrawn = node.nonempty();

    if (isDrawn) node.move({ parent });
  }
};

/** Replaces the folder boxes: one compound per group holding its packages, or none for `null`; no position changes. */
export const setBoxes = (cy: Core, groups: FolderGroup[] | null): void => {
  cy.batch((): void => {
    clearBoxes(cy);

    for (const group of groups ?? []) fillBox(cy, group);
  });
};
