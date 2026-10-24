import type { ElementRect, ViewportPoint } from './playwright.type.ts';

/** A base64 PNG screenshot, the points to read in it (px from its top left) and the two colours as `#rrggbb`. */
export type FlowEdgeShot = {
  readonly png: string;
  readonly points: ViewportPoint[];
  readonly highlighted: string;
  readonly background: string;
};

/** The flow overlay's inked pixels: how many, and the box around them in CSS px from the canvas's top left, `null` with none. */
export type FlowInk = {
  readonly count: number;
  readonly bounds: ElementRect | null;
};
