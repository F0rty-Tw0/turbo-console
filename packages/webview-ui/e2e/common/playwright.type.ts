import type { Page, Route } from '@playwright/test';

import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';

/** A role name `getByRole` accepts. */
export type AriaRoleName = Parameters<Page['getByRole']>[0];

export type RouteHandler = (route: Route) => Promise<void>;

/** A spot in the viewport, in CSS pixels. */
export type ViewportPoint = {
  readonly x: number;
  readonly y: number;
};

/** A synthetic camera input at `point`: wheel lines to zoom by, or px to drag right by. */
export type SyntheticMove = {
  readonly point: ViewportPoint;
  readonly amount: number;
};

/** A page area in CSS pixels, as `page.screenshot` clips it. */
export type ScreenClip = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
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

/** The graph's nodes, its zoom and its container's box, read together. */
export type GraphView = {
  readonly nodes: ProbeNode[];
  readonly zoom: number;
  readonly container: ElementRect;
};
