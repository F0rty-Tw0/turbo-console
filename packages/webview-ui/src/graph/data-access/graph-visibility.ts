import type { Core, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';

/** Hides every package outside `visible` with a bypass `display`, which survives restyling and class changes and keeps positions. */
export const showOnly = (cy: Core, visible: ReadonlySet<string>): void => {
  const setDisplay = (node: NodeSingular): void => {
    const display = visible.has(node.id()) ? 'element' : 'none';

    node.style('display', display);
  };

  cy.batch((): void => void packageNodes(cy).forEach(setDisplay));
};

/**
 * Fits the camera to the visible packages, a trace's ghosts included so they stay on screen, and to their folder boxes,
 * whose frames reach past the packages by the box padding; with none visible the camera stays.
 */
export const fitVisible = (cy: Core, paddingPx: number): void => {
  const shown = packageNodes(cy).filter(':visible');
  const nothingShown = shown.empty();

  if (nothingShown) return;

  const framed = shown.union(shown.parents());

  cy.fit(framed, paddingPx);
};

/** Pans so the node sits at the view centre, keeping the zoom; an unknown name does nothing. */
export const centreOnNode = (cy: Core, name: string): void => {
  const node = cy.getElementById(name);
  const unknown = node.empty();

  if (unknown) return;

  cy.center(node);
};
