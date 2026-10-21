import type { Page, Route } from '@playwright/test';

/** A role name `getByRole` accepts. */
export type AriaRoleName = Parameters<Page['getByRole']>[0];

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
