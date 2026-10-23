import type { Core, EventObject, EventObjectEdge, EventObjectNode, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
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
 * Reports the canvas events to `handlers`; the tap on the background is the core's own, never a node's or edge's, a
 * folder link's tap is a background tap, and a ghost's taps report nothing. A double tap is two taps on the same package,
 * box or collapsed folder id within `DOUBLE_TAP_MS`, detected here:
 * Cytoscape's `dbltap` fires on timing alone, whatever the first tap hit, and spends the pair so a real double-click
 * right after a tap elsewhere never fires. Ids, not elements, so a redraw between the taps keeps the pair. A drag ends
 * on `dragfreeon`, emitted once on the grabbed node; `dragfree` fires on every dragged element, a box's packages too.
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
  cy.on('dragfreeon', 'node', (): void => handlers.onDragEnd(positionsOf(cy)));
  cy.on('viewport', handlers.onViewport);
  cy.on('render', (): void => {
    const end = performance.now() + 30;

    while (performance.now() < end) {
      // deliberate slowdown for the M4-6 bench proof; throwaway branch
    }

    handlers.onRender();
  });
};
