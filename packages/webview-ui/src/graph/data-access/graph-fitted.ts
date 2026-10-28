import type { Core } from 'cytoscape';

import { panBy, viewportOf } from './graph-camera.ts';
import { centreOnNode, fitVisible } from './graph-visibility.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FittedCamera } from '../common/fitted-camera.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import { isSameViewport } from '../utils/viewport.util.ts';

const FIT_PADDING_PX = 24;

/**
 * Cytoscape emits these after a user gesture, and after the `viewport` event that saves it; it emits them also when the
 * zoom is clamped and nothing moved, and then no `viewport` at all.
 */
const GESTURE_EVENTS = 'dragpan scrollzoom pinchzoom';

/**
 * The camera over `cy`: `fit` marks it fitted before the `viewport` event it emits, so that save holds `fitted: true`;
 * `setViewport`, `centreOn` and a gesture that moved the camera away from where a fit or a keep-clear `panBy` left it
 * clear the mark; a keep-clear `panBy` leaves it. While fitted, a container resize fits again in the same observer
 * callback: a fit moves only the camera, so it never resizes the container again.
 */
export const createFittedCamera = (cy: Core, handlers: Pick<GraphViewHandlers, 'onViewport' | 'onRefit'>): FittedCamera => {
  let isFitted = false;
  let left = viewportOf(cy);
  const fitAndRemember = (): void => {
    fitVisible(cy, FIT_PADDING_PX);
    left = viewportOf(cy);
  };
  const fit = (): void => {
    isFitted = true;
    cy.resize();
    fitAndRemember();
  };
  const setViewport = (zoom: number, pan: Position): void => {
    isFitted = false;
    cy.resize();
    cy.viewport({ zoom, pan });
  };
  const centreOn = (name: string): void => {
    isFitted = false;
    centreOnNode(cy, name);
  };
  const keepClear = (dx: number): void => {
    panBy(cy, dx);
    left = viewportOf(cy);
  };
  const gestured = (): void => {
    const isUnmoved = isSameViewport(viewportOf(cy), left);

    if (!isFitted || isUnmoved) return;

    isFitted = false;
    handlers.onViewport();
  };
  const resized = (): void => {
    cy.resize();

    if (!isFitted) return;

    fitAndRemember();
    handlers.onRefit();
  };
  const camera: FittedCamera = { fit, setViewport, centreOn, panBy: keepClear, isFitted: (): boolean => isFitted, resized };

  cy.on(GESTURE_EVENTS, gestured);

  return camera;
};
