import type { PanelSide } from '../common/graph-page.type.ts';
import { SASHING_CLASS, SASH_DRAGGING_CLASS } from '../common/graph.const.ts';
import type { SashResizer } from '../common/panel-sash.type.ts';
import { sashDragWidthOf, sashKeyWidthOf } from '../utils/sash-input.util.ts';

const PRIMARY_BUTTON = 0;

/**
 * Wires one sash to its panel: a pointer drag resizes while the sash holds the pointer and saves on release, a double
 * click resets, and the arrow, Home and End keys resize and save. Any other key is left alone so Tab still moves on.
 */
export const wireSashInput = (side: PanelSide, sash: HTMLElement, sashes: SashResizer, body: HTMLElement): void => {
  const dragEnded = (event: PointerEvent): void => {
    const isDragging = sash.hasPointerCapture(event.pointerId);

    if (!isDragging) return;

    sash.releasePointerCapture(event.pointerId);
    sash.classList.remove(SASH_DRAGGING_CLASS);
    body.classList.remove(SASHING_CLASS);
    sashes.commit();
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== PRIMARY_BUTTON) return;

    sash.setPointerCapture(event.pointerId);
    sash.classList.add(SASH_DRAGGING_CLASS);
    body.classList.add(SASHING_CLASS);
  };
  const onPointerMove = (event: PointerEvent): void => {
    const isDragging = sash.hasPointerCapture(event.pointerId);

    if (!isDragging) return;

    const px = sashDragWidthOf(side, event.clientX, body.getBoundingClientRect());

    sashes.resize(side, px);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const next = sashKeyWidthOf(side, event.key, sashes.widthOf(side), sashes.maxOf(side));

    if (next === null) return;

    event.preventDefault();
    sashes.resize(side, next);
    sashes.commit();
  };

  sash.addEventListener('pointerdown', onPointerDown);
  sash.addEventListener('pointermove', onPointerMove);
  sash.addEventListener('pointerup', dragEnded);
  sash.addEventListener('pointercancel', dragEnded);
  sash.addEventListener('dblclick', (): void => sashes.reset(side));
  sash.addEventListener('keydown', onKeyDown);
};
