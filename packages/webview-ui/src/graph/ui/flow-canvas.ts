import { FLOW_CLASS } from '../common/flow.const.ts';

/** The flow overlay's canvas: decoration only, so it is hidden from assistive tech and never focused. */
export const buildFlowCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');

  canvas.className = FLOW_CLASS;
  canvas.setAttribute('aria-hidden', 'true');

  return canvas;
};

/** Lays the canvas over `container`, its bitmap at device pixels and its pen scaled back to CSS pixels; resizing clears it. */
export const fitFlowCanvas = (canvas: HTMLCanvasElement, container: HTMLElement): void => {
  const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = container;
  const scale = window.devicePixelRatio;
  const pen = canvas.getContext('2d');

  canvas.style.left = `${offsetLeft}px`;
  canvas.style.top = `${offsetTop}px`;
  canvas.style.width = `${offsetWidth}px`;
  canvas.style.height = `${offsetHeight}px`;
  canvas.width = Math.round(offsetWidth * scale);
  canvas.height = Math.round(offsetHeight * scale);
  pen?.setTransform(scale, 0, 0, scale, 0, 0);
};
