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
 * Returns a request that runs `refit` at once, or, while a node or box is grabbed, once at the `free`: Cytoscape keeps
 * the grabbed element under the pointer, so a refit mid-drag would drop it away from where the user let go. `free`
 * fires on every dragged element, a box's packages too, after all of them are released; the first one runs it.
 */
const holdWhileGrabbed = (cy: Core, refit: () => void): (() => void) => {
  let isGrabbing = false;
  let isHeld = false;
  const freed = (): void => {
    const isDue = isHeld;

    isGrabbing = false;
    isHeld = false;

    if (isDue) refit();
  };
  const request = (): void => {
    if (isGrabbing) return void (isHeld = true);

    refit();
  };

  cy.on('grab', (): void => void (isGrabbing = true));
  cy.on('free', freed);

  return request;
};

/**
 * The camera over `cy`: `fit` marks it fitted before the `viewport` event it emits, so that save holds `fitted: true`;
 * `setViewport`, `centreOn` and a gesture that moved the camera away from where a fit or a keep-clear `panBy` left it
 * clear the mark; a keep-clear `panBy` leaves it. While fitted, a container resize fits again in the same observer
 * callback: a fit moves only the camera, so it never resizes the container again. While a node or box is grabbed, the
 * resize still runs but the fit waits for the `free`, and runs then only if the camera is still fitted.
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
  const refitIfFitted = (): void => {
    if (!isFitted) return;

    fitAndRemember();
    handlers.onRefit();
  };
  const refitWhenFree = holdWhileGrabbed(cy, refitIfFitted);
  const resized = (): void => {
    cy.resize();
    refitWhenFree();
  };
  const camera: FittedCamera = { fit, setViewport, centreOn, panBy: keepClear, isFitted: (): boolean => isFitted, resized };

  cy.on(GESTURE_EVENTS, gestured);

  return camera;
};
