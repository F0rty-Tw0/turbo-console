import type { Route } from '@playwright/test';

export type RouteHandler = (route: Route) => Promise<void>;

/** A spot in the viewport, in CSS pixels. */
export type ViewportPoint = {
  readonly x: number;
  readonly y: number;
};

/** An element's box from `getBoundingClientRect`. */
export type ElementRect = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

/** A fact's value either sits beside its term (two columns) or below it (one column). */
export type FactPlacement = 'beside' | 'below';
