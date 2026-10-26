import type { Core, NodeCollection, NodeSingular } from 'cytoscape';

import { FOLDER_NODE_CLASS, NODE_BORDER_PX } from '../common/graph.const.ts';
import type { FolderRect, RectPx, WidgetRects } from '../common/widget.type.ts';
import { folderOfElementId } from '../utils/folder-id.util.ts';

const RENDERED_BOX = { includeLabels: false, includeOverlays: false };

const renderedRectOf = (node: NodeSingular): RectPx => {
  const box = node.renderedBoundingBox(RENDERED_BOX);
  const rect: RectPx = { x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 };

  return rect;
};

/** The node's border width in graph px; Cytoscape types `numericStyle` as `any`. */
const borderWidthOf = (node: NodeSingular): number => {
  const width: unknown = node.numericStyle('border-width');

  return typeof width === 'number' ? width : 0;
};

/** The rendered rect, and its width at the plain border, so a `selected` border leaves the width alone. */
const folderRectOf = (node: NodeSingular): FolderRect => {
  const rect = renderedRectOf(node);
  const extraBorder = (borderWidthOf(node) - NODE_BORDER_PX) * node.cy().zoom();
  const width = rect.x2 - rect.x1 - extraBorder;
  const folderRect: FolderRect = { rect, width };

  return folderRect;
};

/** The drawn nodes' folder rects by folder key, in collection order. */
const rectsByFolder = (nodes: NodeCollection): Map<string, FolderRect> => {
  const rects = new Map<string, FolderRect>();

  for (const node of nodes) {
    const folder = folderOfElementId(node.id());
    const isDrawn = node.visible();

    if (folder !== null && isDrawn) rects.set(folder, folderRectOf(node));
  }

  return rects;
};

/** The selected package's rendered rect while it is drawn, else `null`. */
const selectedRectOf = (cy: Core, selected: string | null): RectPx | null => {
  if (selected === null) return null;

  const node = cy.getElementById(selected);
  const isKnown = node.nonempty();

  if (!isKnown) return null;

  const isDrawn = node.visible();

  if (!isDrawn) return null;

  return renderedRectOf(node);
};

/** What the widget layer places over: drawn folder boxes, drawn collapsed nodes and the selected package, in container px. */
export const widgetRectsOf = (cy: Core, selected: string | null): WidgetRects => {
  const boxNodes = cy.nodes(':parent');
  const collapsedNodes = cy.nodes(`.${FOLDER_NODE_CLASS}`);
  const boxes = rectsByFolder(boxNodes);
  const collapsed = rectsByFolder(collapsedNodes);
  const selectedRect = selectedRectOf(cy, selected);
  const rects: WidgetRects = { boxes, collapsed, selected: selectedRect, zoom: cy.zoom() };

  return rects;
};
