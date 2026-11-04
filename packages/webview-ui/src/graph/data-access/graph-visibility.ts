import type { Collection, Core, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import { FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { flooredViewportOf } from '../utils/floored-viewport.util.ts';

/** Hides every package outside `visible` with a bypass `display`, which survives restyling and class changes and keeps positions. */
export const showOnly = (cy: Core, visible: ReadonlySet<string>): void => {
  const setDisplay = (node: NodeSingular): void => {
    const display = visible.has(node.id()) ? 'element' : 'none';

    node.style('display', display);
  };

  cy.batch((): void => void packageNodes(cy).forEach(setDisplay));
};

/**
 * What a fit frames: the visible packages, a trace's ghosts included so they stay on screen, their folder boxes, whose
 * frames reach past the packages by the box padding, the drawn collapsed folders, and the visible edges, whose routes
 * bend past the nodes.
 */
export const framedOf = (cy: Core): Collection => {
  const shown = packageNodes(cy).filter(':visible');
  const collapsed = cy.nodes(`.${FOLDER_NODE_CLASS}:visible`);
  const lines = cy.edges(':visible');

  return shown.union(shown.parents()).union(collapsed).union(lines);
};

/** Fits the camera to `framedOf`; with nothing framed the camera stays. */
export const fitVisible = (cy: Core, paddingPx: number): void => {
  const framed = framedOf(cy);
  const nothingShown = framed.empty();

  if (nothingShown) return;

  cy.fit(framed, paddingPx);
};

/** The floored viewport a first open uses in place of `fitVisible`, from the box that fit would get; `null` keeps the true fit. */
export const openViewportOf = (cy: Core, paddingPx: number): Viewport | null => {
  const framed = framedOf(cy);
  const nothingShown = framed.empty();

  if (nothingShown) return null;

  const canvas = { width: cy.width(), height: cy.height() };

  return flooredViewportOf(framed.boundingBox(), canvas, paddingPx);
};

/** Pans so the node sits at the view centre, keeping the zoom; an unknown name does nothing. */
export const centreOnNode = (cy: Core, name: string): void => {
  const node = cy.getElementById(name);
  const unknown = node.empty();

  if (unknown) return;

  cy.center(node);
};
