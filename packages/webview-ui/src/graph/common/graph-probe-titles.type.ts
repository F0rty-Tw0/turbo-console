/** A box in page CSS pixels. */
export type ProbeRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/**
 * A task mode package box (`pkg:` id) and its title: `label` is the drawn title's box and `box` the box's rendered
 * bounds without labels or overlays, both in page CSS pixels; `modelBox` is the box in model pixels.
 */
export type ProbeTitle = {
  readonly id: string;
  readonly text: string;
  readonly label: ProbeRect;
  readonly box: ProbeRect;
  readonly modelBox: ProbeRect;
};
