import type { TaskScreenElements } from './graph-task.type.ts';
import type { LegendElements } from './legend.type.ts';
import type { LocationBarElements } from './location.type.ts';
import type { PanelSashes } from './panel-sash.type.ts';

/** The page's parts other than the Legend's. */
type PageParts = {
  readonly root: HTMLElement;
  readonly toolbar: HTMLElement;
  /** The Packages/Tasks group and its separator; hidden for a single-package root. */
  readonly modeGroup: HTMLElement;
  readonly modeEnd: HTMLElement;
  /** The Packages button, first in the toolbar; `aria-pressed` while the package graph shows. */
  readonly packagesMode: HTMLButtonElement;
  /** The Tasks button, after Packages; `aria-pressed` while task mode is on. */
  readonly taskMode: HTMLButtonElement;
  /**
   * Toggles the controls panel `aside#graph-controls`; `GraphControls` keeps its label and `aria-expanded` current. In task
   * mode it toggles `aside#graph-task-controls`, and `GraphTaskControls` points `aria-controls` and `aria-expanded` there.
   */
  readonly controls: HTMLButtonElement;
  /** Toggles the details panel `aside#graph-details`. */
  readonly details: HTMLButtonElement;
  /** `span.filters-on` inside the Controls button, shown while any filter is on. */
  readonly filtersOn: HTMLElement;
  readonly fit: HTMLButtonElement;
  readonly relayout: HTMLButtonElement;
  /** Enabled exactly when `fit` is: both need a visible package. */
  readonly exportImage: HTMLButtonElement;
  /** Clear selection: the icon-only button in `detailsBar`, disabled while nothing is selected. */
  readonly clear: HTMLButtonElement;
  /** The toolbar's visually hidden live region, which reads the package selection out. */
  readonly status: HTMLElement;
  /** `div.details-bar`: the summary and `clear`, first in the mounted Details aside; `hidden` while nothing is selected. */
  readonly detailsBar: HTMLDivElement;
  /** `p.details-summary`: the package selection's text, as `status` reads it; empty in task mode. */
  readonly detailsSummary: HTMLElement;
  readonly notice: HTMLElement;
  /** The `p` inside the notice: the simplified-layout copy, or a mode switch's progress text. */
  readonly noticeText: HTMLElement;
  readonly retry: HTMLButtonElement;
  /** Task mode's notice, cap banner and prompt, between the notice and the message. */
  readonly taskScreen: TaskScreenElements;
  readonly message: HTMLElement;
  readonly messageText: HTMLElement;
  readonly reload: HTMLButtonElement;
  /** `nav.graph-location`, directly before the body and shown with it: where the graph is, in both modes. */
  readonly location: LocationBarElements;
  /**
   * `div.graph-body`: the controls panel, once a graph shows, the Controls sash, the container, the flow overlay, the widget
   * layer, the Details sash, then the details panel.
   */
  readonly body: HTMLElement;
  readonly container: HTMLElement;
  /** `canvas.graph-flow`: the moving dashes over the highlighted task edges, under the widget layer; `aria-hidden`. */
  readonly flow: HTMLCanvasElement;
  /** `div.graph-widgets`: the canvas widgets' layer over the container, its DOM sibling right after it. */
  readonly widgets: HTMLElement;
  readonly sashes: PanelSashes;
};

/** The graph page's elements, built once by `buildPage`; DOM order is the Tab order (toolbar, then the body). */
export type PageElements = PageParts & LegendElements;
