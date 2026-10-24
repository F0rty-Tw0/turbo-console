import type { ElementRect } from './playwright.type.ts';

/** The flow overlay's inked pixels: how many, and the box around them in CSS px from the canvas's top left, `null` with none. */
export type FlowInk = {
  readonly count: number;
  readonly bounds: ElementRect | null;
};
