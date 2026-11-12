/** A box in page CSS pixels. */
export type ProbeRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/**
 * A task mode package box (`pkg:` id) and its title: `label` is the drawn title's box and `box` the box's rendered
 * bounds without labels or overlays, both in page CSS pixels; `modelBox` is the box in model pixels. `isFramed` is
 * whether it is drawn on its ELK frame (`box-framed`); then `frameError` is the largest gap in model pixels between a
 * side of its frame line and the same side of the frame, and `titleError` between the title's top-left corner and the
 * placeholder's; both `null` when not framed. `backdrop` is the colour the title is drawn on while that backdrop is
 * opaque, else `null`; `linesOver` the links the canvas draws after the box, so over its title.
 */
export type ProbeTitle = {
  readonly id: string;
  readonly text: string;
  readonly label: ProbeRect;
  readonly box: ProbeRect;
  readonly modelBox: ProbeRect;
  readonly isFramed: boolean;
  readonly frameError: number | null;
  readonly titleError: number | null;
  readonly backdrop: string | null;
  readonly linesOver: ProbeLink[];
};

/** A link by its two ends' ids. */
export type ProbeLink = {
  readonly source: string;
  readonly target: string;
};

/** The export read: the label a node draws while an export is on. */
export type ProbeExport = { readonly exportLabel: (id: string) => string };
