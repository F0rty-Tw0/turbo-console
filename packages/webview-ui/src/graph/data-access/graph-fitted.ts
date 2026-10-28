import type { Core } from 'cytoscape';

import { centreOnNode, fitVisible } from './graph-visibility.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FittedCamera, FrameRequest } from '../common/fitted-camera.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';

const FIT_PADDING_PX = 24;

/** Cytoscape emits these after a user gesture moved the camera, and after the `viewport` event that saves it. */
const GESTURE_EVENTS = 'dragpan scrollzoom pinchzoom';

const nextFrame: FrameRequest = (run: () => void): void => void requestAnimationFrame((): void => run());

/**
 * The camera over `cy`: `fit` marks it fitted before the `viewport` event it emits, so that save holds `fitted: true`; a
 * gesture, `setViewport` and `centreOn` clear the mark; a keep-clear `panBy` leaves it. While fitted, a container resize
 * fits again one frame later.
 */
export const createFittedCamera = (
  cy: Core,
  handlers: Pick<GraphViewHandlers, 'onViewport' | 'onRefit'>,
  frame: FrameRequest = nextFrame
): FittedCamera => {
  let isFitted = false;
  let isPending = false;
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
  const refitIfFitted = (): void => {
    isPending = false;
    cy.resize();

    if (!isFitted) return;

    fitVisible(cy, FIT_PADDING_PX);
    handlers.onRefit();
  };
  const resized = (): void => {
    if (isPending) return;

    isPending = true;
    frame(refitIfFitted);
  };
  const camera: FittedCamera = { fit, setViewport, centreOn, isFitted: (): boolean => isFitted, resized };

  cy.on(GESTURE_EVENTS, gestured);

  return camera;
};
