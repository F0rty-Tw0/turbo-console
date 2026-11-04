/** The 1 px screen spot under a folder title's text where a package line crosses: the pixel's top left corner, in page CSS pixels. */
export type ChipSpot = {
  readonly x: number;
  readonly y: number;
};

/** A pixel's red, green and blue, each 0 to 255. */
export type Rgb = readonly [number, number, number];
