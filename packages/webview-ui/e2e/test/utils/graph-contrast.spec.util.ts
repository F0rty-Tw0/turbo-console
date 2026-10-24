import type { ContrastInput } from '../../common/graph.type.ts';

/**
 * Runs in the page: decodes a base64 PNG clip and returns the largest WCAG contrast ratio of any of its pixels against
 * `background`. Its luminance is its own, written apart from `contrast.util.ts`, so it checks the source, not itself.
 */
export const maxContrastIn = async ({ png, background }: ContrastInput): Promise<number> => {
  const channelTexts = background.match(/\d+/g) ?? [];
  const backgroundRgb = channelTexts.map(Number);
  const linear = (byte: number): number => {
    const unit = byte / 255;

    if (unit <= 0.03928) return unit / 12.92;

    return Math.pow((unit + 0.055) / 1.055, 2.4);
  };
  const luminance = (red: number, green: number, blue: number): number =>
    0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  const charCodeOf = (char: string): number => char.charCodeAt(0);
  const bytes = Uint8Array.from(atob(png), charCodeOf);
  const blob = new Blob([bytes], { type: 'image/png' });
  const image = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('No 2D context to decode the PNG');

  context.drawImage(image, 0, 0);

  const { data } = context.getImageData(0, 0, image.width, image.height);
  const backgroundLuminance = luminance(backgroundRgb[0] ?? 0, backgroundRgb[1] ?? 0, backgroundRgb[2] ?? 0);
  const pixels = Array.from({ length: data.length / 4 }, (_, index: number): number => index * 4);
  const ratioAt = (offset: number): number => {
    const pixel = luminance(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
    const lighter = Math.max(pixel, backgroundLuminance);
    const darker = Math.min(pixel, backgroundLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  };
  const higher = (most: number, offset: number): number => Math.max(most, ratioAt(offset));

  return pixels.reduce(higher, 1);
};
