/* eslint-disable -- C44 mutant: 100 ms freeze in one pan frame, removed in the next commit */
import type { Core, EventObject, EventObjectEdge, EventObjectNode, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import { DOUBLE_TAP_MS, FOLDER_ID_PREFIX, GHOST_CLASS } from '../common/graph.const.ts';

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
 * Reports the canvas events to `handlers`; the tap on the background is the core's own, never a node's or edge's, and a
 * ghost's taps report nothing. A double tap is two taps on the same package id within `DOUBLE_TAP_MS`, detected here:
 * Cytoscape's `dbltap` fires on timing alone, whatever the first tap hit, and spends the pair so a real double-click
 * right after a tap elsewhere never fires. Ids, not elements, so a redraw between the taps keeps the pair. A drag ends
 * on `dragfreeon`, emitted once on the grabbed node; `dragfree` fires on every dragged element, a box's packages too.
 */
export const listen = (cy: Core, handlers: GraphViewHandlers): void => {
  let lastPackage: string | null = null;
  let lastTapAt = Number.NEGATIVE_INFINITY;

  /** Records a tap on `name` (`null`: anything but a package) and says whether it completes a double tap. */
  const noteTap = (name: string | null, at: number): boolean => {
    const gap = at - lastTapAt;
    const isDouble = name !== null && name === lastPackage && gap >= 0 && gap <= DOUBLE_TAP_MS;

    lastPackage = isDouble ? null : name;
    lastTapAt = at;

    return isDouble;
  };
  const onBackground = (event: EventObject): void => {
    if (event.target !== cy) return;

    noteTap(null, event.timeStamp);
    handlers.onTapBackground();
  };
  const onBox = (event: EventObjectNode): void => {
    const folder = nodeName(event).slice(FOLDER_ID_PREFIX.length);

    noteTap(null, event.timeStamp);
    handlers.onTapFolder(folder);
  };
  const onNode = (event: EventObjectNode): void => {
    const isBox = nodeName(event).startsWith(FOLDER_ID_PREFIX);

    if (isBox) {
      onBox(event);

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

    const source = event.target.source().id();
    const target = event.target.target().id();

    handlers.onTapEdge(source, target);
  };

  cy.on('tap', 'node', onNode);
  cy.on('tap', 'edge', onEdge);
  cy.on('tap', onBackground);
  cy.on('dragfreeon', 'node', (): void => handlers.onDragEnd(positionsOf(cy)));
  let mutantViewports = 0;
  cy.on('viewport', (): void => {
    mutantViewports += 1;
    if (mutantViewports === 60) {
      const end = performance.now() + 100;

      while (performance.now() < end) {
        // C44 mutant: a 100 ms freeze in one pan frame.
      }
    }
    handlers.onViewport();
  });
  cy.on('render', handlers.onRender);
};
