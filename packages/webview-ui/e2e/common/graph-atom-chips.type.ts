/**
 * How far each side of an umbrella's chip row sits inside the umbrella, in page CSS pixels; negative where it pokes out.
 * `top` is measured from the umbrella's rendered centre, the top of its counts band.
 */
export type ChipRowMargins = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};
