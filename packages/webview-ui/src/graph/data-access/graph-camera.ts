import type { CollectionReturnValue, Core } from 'cytoscape';

import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';

const BOX_OPTIONS = { includeLabels: false, includeOverlays: false };

const isShown = (node: CollectionReturnValue): boolean => node.nonempty() && node.visible();

const spanOf = (node: CollectionReturnValue): AnchorBox => {
  const { x1, x2 } = node.renderedBoundingBox(BOX_OPTIONS);
  const span: AnchorBox = { x1, x2 };

  return span;
};

const joinSpans = (box: AnchorBox | null, span: AnchorBox): AnchorBox => {
  if (box === null) return span;

  const joined: AnchorBox = { x1: Math.min(box.x1, span.x1), x2: Math.max(box.x2, span.x2) };

  return joined;
};

/** The union of the named nodes' rendered spans; unknown and hidden names are left out, `null` when none is left. */
export const anchorBoxOf = (cy: Core, names: string[]): AnchorBox | null => {
  const nodes = names.map((name: string): CollectionReturnValue => cy.getElementById(name));
  const spans = nodes.filter(isShown).map(spanOf);

  return spans.reduce<AnchorBox | null>(joinSpans, null);
};

/** Pans horizontally by `dx` rendered px, with no animation and the zoom unchanged. */
export const panBy = (cy: Core, dx: number): void => {
  cy.panBy({ x: dx, y: 0 });
};

/** A copy of the camera: `cy.pan()` is Cytoscape's own object, which a later pan changes in place. */
export const viewportOf = (cy: Core): Viewport => {
  const { x, y } = cy.pan();
  const pan: Position = { x, y };
  const current: Viewport = { zoom: cy.zoom(), pan };

  return current;
};
