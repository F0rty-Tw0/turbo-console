import type { PressPngs } from '../../common/graph.type.ts';

/**
 * Runs in the page: decodes both PNG clips and returns the largest difference of any one channel at any one pixel, 0
 * when they match. The two clips have the same size.
 */
export const maxChannelDeltaOf = async ({ before, during }: PressPngs): Promise<number> => {
  const charCodeOf = (char: string): number => char.charCodeAt(0);
  const pixelsOf = async (png: string): Promise<Uint8ClampedArray> => {
    const bytes = Uint8Array.from(atob(png), charCodeOf);
    const blob = new Blob([bytes], { type: 'image/png' });
    const image = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d');

    if (context === null) throw new Error('No 2D context to decode the PNG');

    context.drawImage(image, 0, 0);

    return context.getImageData(0, 0, image.width, image.height).data;
  };
  const beforePixels = await pixelsOf(before);
  const duringPixels = await pixelsOf(during);
  const deltaAt = (most: number, value: number, index: number): number => Math.max(most, Math.abs(value - (duringPixels[index] ?? 0)));

  return beforePixels.reduce(deltaAt, 0);
};
