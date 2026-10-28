import type { Core } from 'cytoscape';

import { centreOnNode, fitVisible } from './graph-visibility.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FittedCamera } from '../common/fitted-camera.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';

const FIT_PADDING_PX = 24;

/** Cytoscape emits these after a user gesture moved the camera, and after the `viewport` event that saves it. */
const GESTURE_EVENTS = 'dragpan scrollzoom pinchzoom';

/**
 * The camera over `cy`: `fit` marks it fitted before the `viewport` event it emits, so that save holds `fitted: true`; a
 * gesture, `setViewport` and `centreOn` clear the mark; a keep-clear `panBy` leaves it. While fitted, a container resize
 * fits again in the same observer callback: a fit moves only the camera, so it never resizes the container again.
 */
export const createFittedCamera = (cy: Core, handlers: Pick<GraphViewHandlers, 'onViewport' | 'onRefit'>): FittedCamera => {
  let isFitted = false;
  const fit = (): void => {
    isFitted = true;
    cy.resize();
    fitVisible(cy, FIT_PADDING_PX);
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
  const gestured = (): void => {
    if (!isFitted) return;

    isFitted = false;
    handlers.onViewport();
  };
  const resized = (): void => {
    cy.resize();

    if (!isFitted) return;

    fitVisible(cy, FIT_PADDING_PX);
    handlers.onRefit();
  };
  const camera: FittedCamera = { fit, setViewport, centreOn, isFitted: (): boolean => isFitted, resized };

  cy.on(GESTURE_EVENTS, gestured);

  return camera;
};
