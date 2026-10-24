import type { FlowInk } from '../../common/graph-flow.type.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

/**
 * Runs in the page through `evaluate`, so it reads only its argument and page globals: every pixel whose alpha (the
 * fourth byte of each RGBA pixel) is above 0, its box in CSS px.
 */
export const readFlowInk = (canvas: HTMLCanvasElement): FlowInk => {
  const { width, height } = canvas;
  const pen = canvas.getContext('2d');
  const image = pen?.getImageData(0, 0, width, height);
  const pixels = image?.data ?? new Uint8ClampedArray();
  const scale = window.devicePixelRatio;
  let count = 0;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < width * height; index += 1) {
    const alpha = pixels[index * 4 + 3] ?? 0;
    const x = index % width;
    const y = Math.floor(index / width);

    if (alpha > 0) {
      count += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  const bounds: ElementRect = { left: left / scale, top: top / scale, width: (right - left) / scale, height: (bottom - top) / scale };
  const shown = count === 0 ? null : bounds;
  const ink: FlowInk = { count, bounds: shown };

  return ink;
};
