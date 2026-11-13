import type { GraphOptions } from './graph.type.ts';
import type { NavigationWait } from './playwright.type.ts';

/** How a page open navigates. */
type NavigationOptions = {
  /** `load` when unset. */
  readonly waitUntil?: NavigationWait;
};

/** What a graph page open takes: the page's options and how it navigates. */
export type GraphOpenOptions = GraphOptions & NavigationOptions;
