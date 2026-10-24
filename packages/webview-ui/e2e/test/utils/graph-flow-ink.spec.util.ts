import type { FlowEdgeShot, FlowInk } from '../../common/graph-flow.type.ts';
import type { ElementRect, ViewportPoint } from '../../common/playwright.type.ts';

const SWAPS = new Set(['hb', 'bh']);

/** How many points read `h` in one reading and `b` in the other, or the reverse. */
export const colourSwapsOf = (earlier: string, later: string): number => {
  const pairOf = (colour: string, index: number): string => `${colour}${later[index] ?? ''}`;
  const pairs = Array.from(earlier, pairOf);
  const swapped = pairs.filter((pair: string): boolean => SWAPS.has(pair));

  return swapped.length;
};

/**
 * Runs in the page: decodes the shot and reads each point as `h` when a pixel of its 3 x 3 block is within 48 of
 * `highlighted` in every channel, else `b` when the point itself is within 48 of `background`, else `.`. The 3 x 3
 * block keeps a line that falls between two pixel rows from reading as neither colour.
 */
export const readEdgeColours = async (shot: FlowEdgeShot): Promise<string> => {
  const TOLERANCE = 48;
  const CHANNELS = [0, 1, 2];
  const NEAR = [-1, 0, 1];
  const rgbOf = (hex: string): number[] =>
    CHANNELS.map((channel: number): number => Number.parseInt(hex.slice(1 + channel * 2, 3 + channel * 2), 16));
  const highlighted = rgbOf(shot.highlighted);
  const background = rgbOf(shot.background);
  const charCodeOf = (char: string): number => char.charCodeAt(0);
  const bytes = Uint8Array.from(atob(shot.png), charCodeOf);
  const blob = new Blob([bytes], { type: 'image/png' });
  const image = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('No 2D context to decode the PNG');

  context.drawImage(image, 0, 0);

  const { data, width } = context.getImageData(0, 0, image.width, image.height);
  const isNear = (x: number, y: number, rgb: number[]): boolean => {
    const offset = (y * width + x) * 4;

    return CHANNELS.every((channel: number): boolean => Math.abs((data[offset + channel] ?? 0) - (rgb[channel] ?? 0)) <= TOLERANCE);
  };
  const isLit = (point: ViewportPoint): boolean =>
    NEAR.some((dy: number): boolean => NEAR.some((dx: number): boolean => isNear(point.x + dx, point.y + dy, highlighted)));
  const colourOf = (point: ViewportPoint): string => {
    const isLitHere = isLit(point);

    if (isLitHere) return 'h';

    const isBackground = isNear(point.x, point.y, background);

    return isBackground ? 'b' : '.';
  };
  const colours = shot.points.map(colourOf);

  return colours.join('');
};

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
