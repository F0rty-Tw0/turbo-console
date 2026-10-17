import type { Route } from '@playwright/test';

export type RouteHandler = (route: Route) => Promise<void>;

/** A spot in the viewport, in CSS pixels. */
export type ViewportPoint = {
  readonly x: number;
  readonly y: number;
};
