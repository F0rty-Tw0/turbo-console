import type { BoundingBox12, Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { probeStateOf, styleText } from './graph-probe-state.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeFolder, ProbeFolderLink, ProbeRect } from '../common/graph-probe.type.ts';
import { BOX_COLLAPSED_CLASS, FOLDER_HIDDEN_CLASS, FOLDER_ID_PREFIX, FOLDER_LINK_CLASS } from '../common/graph.const.ts';
import { collapsedIdOf, folderOfElementId } from '../utils/folder-id.util.ts';

const RECT_OPTIONS = { includeLabels: false, includeOverlays: false };

const NO_RECT: BoundingBox12 = { x1: 0, x2: 0, y1: 0, y2: 0 };

const idOf = (node: NodeSingular): string => node.id();

/** The rendered box of `node`, all 0 when it is not drawn. */
const rectOf = (node: NodeSingular): BoundingBox12 => {
  const isNone = node.empty();

  if (isNone) return NO_RECT;

  return node.renderedBoundingBox(RECT_OPTIONS);
};

/**
 * `box` as its folder key, state, centre and size in page CSS pixels (`origin` is the container's top left corner), drawn
 * label and packages; a collapsed folder reads its collapsed node, which is missing while the folder is not shown.
 */
const probeFolderOf = (cy: Core, box: NodeSingular, origin: Position): ProbeFolder => {
  const folder = box.id().slice(FOLDER_ID_PREFIX.length);
  const isCollapsed = box.hasClass(BOX_COLLAPSED_CLASS);
  const collapsedNode = cy.getElementById(collapsedIdOf(folder));
  const shown = isCollapsed ? collapsedNode : box;
  const hasNode = collapsedNode.nonempty();
  const isBoxShown = !box.hasClass(FOLDER_HIDDEN_CLASS);
  const isVisible = isCollapsed ? hasNode : isBoxShown;
  const { x1, x2, y1, y2 } = rectOf(shown);
  const packages = box.children().map(idOf);
  const probeFolder: ProbeFolder = {
    folder,
    isCollapsed,
    isVisible,
    state: probeStateOf(shown),
    renderedX: origin.x + (x1 + x2) / 2,
    renderedY: origin.y + (y1 + y2) / 2,
    renderedWidth: x2 - x1,
    renderedHeight: y2 - y1,
    text: styleText(shown, 'label'),
    packages
  };

  return probeFolder;
};

/** The folder boxes sorted by folder key code unit, the root `''` first; none while the graph is flat. */
export const probeFoldersOf = (cy: Core, origin: Position): ProbeFolder[] => {
  const ids = cy.nodes(':parent').map(idOf).sort();
  const probeIdFolder = (id: string): ProbeFolder => probeFolderOf(cy, cy.getElementById(id), origin);

  return ids.map(probeIdFolder);
};

const endOf = (id: string): string => folderOfElementId(id) ?? id;

const LABEL_OPTIONS = { includeLabels: true, includeEdges: false, includeNodes: false, includeOverlays: false };

/** The label of `edge` in page CSS pixels (`origin` is the container's top left corner). */
const labelBoxOf = (edge: EdgeSingular, origin: Position): ProbeRect => {
  const { x1, x2, y1, y2 } = edge.renderedBoundingBox(LABEL_OPTIONS);
  const box: ProbeRect = { left: origin.x + x1, top: origin.y + y1, width: x2 - x1, height: y2 - y1 };

  return box;
};

const probeFolderLinkOf = (edge: EdgeSingular, origin: Position): ProbeFolderLink => {
  const countData: unknown = edge.data('count');
  const count = typeof countData === 'number' ? countData : 0;
  const link: ProbeFolderLink = {
    source: endOf(edge.source().id()),
    target: endOf(edge.target().id()),
    count,
    isDrawn: edge.visible(),
    state: probeStateOf(edge),
    labelBox: labelBoxOf(edge, origin)
  };

  return link;
};

/** The drawn folder links in drawing order. */
export const probeFolderLinksOf = (cy: Core, origin: Position): ProbeFolderLink[] => {
  const probeLink = (edge: EdgeSingular): ProbeFolderLink => probeFolderLinkOf(edge, origin);

  return cy.edges(`.${FOLDER_LINK_CLASS}`).map(probeLink);
};
