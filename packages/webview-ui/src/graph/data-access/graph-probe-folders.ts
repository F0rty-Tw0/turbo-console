import type { Core, NodeSingular } from 'cytoscape';

import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeFolder } from '../common/graph-probe.type.ts';
import { FOLDER_ID_PREFIX } from '../common/graph.const.ts';

const RECT_OPTIONS = { includeLabels: false, includeOverlays: false };

const idOf = (node: NodeSingular): string => node.id();

/** `box` as its folder key, centre and size in page CSS pixels (`origin` is the container's top left corner) and packages. */
const probeFolderOf = (box: NodeSingular, origin: Position): ProbeFolder => {
  const { x1, x2, y1, y2 } = box.renderedBoundingBox(RECT_OPTIONS);
  const folder = box.id().slice(FOLDER_ID_PREFIX.length);
  const packages = box.children().map(idOf);
  const probeFolder: ProbeFolder = {
    folder,
    isCollapsed: false,
    isVisible: true,
    state: 'normal',
    renderedX: origin.x + (x1 + x2) / 2,
    renderedY: origin.y + (y1 + y2) / 2,
    renderedWidth: x2 - x1,
    renderedHeight: y2 - y1,
    packages
  };

  return probeFolder;
};

/** The folder boxes sorted by folder key code unit, the root `''` first; none while the graph is flat. */
export const probeFoldersOf = (cy: Core, origin: Position): ProbeFolder[] => {
  const ids = cy.nodes(':parent').map(idOf).sort();
  const probeIdFolder = (id: string): ProbeFolder => probeFolderOf(cy.getElementById(id), origin);

  return ids.map(probeIdFolder);
};
