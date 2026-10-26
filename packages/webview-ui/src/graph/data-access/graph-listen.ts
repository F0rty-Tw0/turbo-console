import type { Core, EventObject, EventObjectEdge, EventObjectNode, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
import { containerPainterOf, listenCursor } from './graph-cursor.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import { FOLDER_LINK_ID_PREFIX, GHOST_CLASS } from '../common/graph.const.ts';
import { folderOfElementId } from '../utils/folder-id.util.ts';
import { tapPairOf } from '../utils/tap-pair.util.ts';

const centreEntryOf = (node: NodeSingular): [string, Position] => {
  const { x, y } = node.position();
  const centre: Position = { x, y };

  return [node.id(), centre];
};

const nodeName = (event: EventObjectNode): string => event.target.id();

const isGhost = (event: EventObjectNode | EventObjectEdge): boolean => event.target.hasClass(GHOST_CLASS);

const positionsOf = (cy: Core): Positions => {
  const entries = packageNodes(cy).map(centreEntryOf);

  return Object.fromEntries(entries);
};

/**
 * Reports the hovered node on `mouseover`, none on `mouseout`, and none on the core's own `mouseout`, never a node's
 * bubbling up: the pointer left the canvas, so no node is hovered. Cytoscape keeps the node it last hovered across that
 * exit and sends no `mouseover` when the pointer returns to it, so the first `mousemove` on a node after an exit reports
 * it; a `mouseover` that follows in the same move is the same report and is skipped.
 */
const listenHover = (cy: Core, handlers: GraphViewHandlers): void => {
  let isOutside = false;
  let returnedTo: string | null = null;
  const onOver = (event: EventObjectNode): void => {
    const name = nodeName(event);
    const isReturn = name === returnedTo;

    isOutside = false;
    returnedTo = null;

    if (!isReturn) handlers.onHoverNode(name);
  };
  const onOut = (): void => {
    returnedTo = null;
    handlers.onHoverNode(null);
  };
  const onLeave = (event: EventObject): void => {
    if (event.target !== cy) return;

    isOutside = true;
    onOut();
  };
  const onMove = (event: EventObjectNode): void => {
    if (!isOutside) return;

    isOutside = false;
    returnedTo = nodeName(event);
    handlers.onHoverNode(returnedTo);
  };

  cy.on('mouseover', 'node', onOver);
  cy.on('mouseout', 'node', onOut);
  cy.on('mouseout', onLeave);
  cy.on('mousemove', 'node', onMove);
};

/**
 * Reports the canvas events to `handlers`; the tap on the background is the core's own, never a node's or edge's, a
 * folder link's tap is a background tap, and a ghost's taps report nothing. A double tap is two taps on the same package,
 * box or collapsed folder id within `DOUBLE_TAP_MS`, detected here:
 * Cytoscape's `dbltap` fires on timing alone, whatever the first tap hit, and spends the pair so a real double-click
 * right after a tap elsewhere never fires. Ids, not elements, so a redraw between the taps keeps the pair. A drag ends
 * on `dragfreeon`, emitted once on the grabbed node; `dragfree` fires on every dragged element, a box's packages too.
 * Cytoscape ends a node's hover from its own mousemove only, which never runs once the pointer is outside the container,
 * so a pointer leaving the canvas straight from a node ends the hover on the core's own `mouseout` (the container's),
 * and the pointer coming back onto the same node starts it again on that node's first `mousemove`.
 */
export const listen = (cy: Core, handlers: GraphViewHandlers): void => {
  const noteTap = tapPairOf();
  const onBackground = (event: EventObject): void => {
    if (event.target !== cy) return;

    noteTap(null, event.timeStamp);
    handlers.onTapBackground();
  };
  const onFolder = (event: EventObjectNode, folder: string): void => {
    const isDouble = noteTap(nodeName(event), event.timeStamp);

    handlers.onTapFolder(folder);

    if (isDouble) handlers.onDoubleTapFolder(folder);
  };
  const onNode = (event: EventObjectNode): void => {
    const folder = folderOfElementId(nodeName(event));

    if (folder !== null) {
      onFolder(event, folder);

      return;
    }

    const ghost = isGhost(event);
    const id = nodeName(event);
    const name = ghost ? null : id;
    const isDouble = noteTap(name, event.timeStamp);

    if (name === null) return;

    handlers.onTapNode(name);

    if (isDouble) handlers.onDoubleTapNode(name);
  };
  const onEdge = (event: EventObjectEdge): void => {
    const ghost = isGhost(event);

    noteTap(null, event.timeStamp);

    if (ghost) return;

    const isFolderLink = event.target.id().startsWith(FOLDER_LINK_ID_PREFIX);

    if (isFolderLink) {
      handlers.onTapBackground();

      return;
    }

    const source = event.target.source().id();
    const target = event.target.target().id();

    handlers.onTapEdge(source, target);
  };

  cy.on('tap', 'node', onNode);
  cy.on('tap', 'edge', onEdge);
  cy.on('tap', onBackground);
  listenHover(cy, handlers);
  listenCursor(cy, containerPainterOf(cy));
  cy.on('dragfreeon', 'node', (): void => handlers.onDragEnd(positionsOf(cy)));
  cy.on('viewport', handlers.onViewport);
  cy.on('render', handlers.onRender);
};
