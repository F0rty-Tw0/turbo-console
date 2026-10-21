import type { EmptyDetails, ExplainDetails, LinkDetails, PackageDetails, PickingDetails, TraceDetails } from './details-view.type.ts';
import type { DetailsViews, ExplainState } from './details.type.ts';
import type { DrawnGraph, PageElements } from './graph-page.type.ts';
import type { InspectionInput } from './inspection.type.ts';
import type { TraceCandidates, TraceResult } from './trace.type.ts';

/** How `show` changes the panel: a new view, the shown view updated in place, or the same view built again. */
export type DetailsPlan = 'swap' | 'update' | 'rebuild';

/** How an explain reply changes the explain block: updated in place, or built again. */
export type ExplainPlan = 'update' | 'rebuild';

/** Where focus goes after a list is rebuilt in place: the item with the same name, the view heading, or nowhere. */
export type Refocus = 'item' | 'heading' | 'none';

/** One view of the details panel. */
export type DetailsView = EmptyDetails | PackageDetails | LinkDetails | PickingDetails | TraceDetails;

/**
 * What the views are built from. `candidates` is the full, unfiltered result while picking, else `null`; `showable`
 * holds the path packages whose Show is allowed; `isRebuild` builds the shown view again.
 */
export type DetailsContext = {
  readonly drawn: DrawnGraph;
  readonly visible: ReadonlySet<string>;
  readonly focus: string | null;
  readonly trace: TraceResult | null;
  readonly candidates: TraceCandidates | null;
  readonly showable: ReadonlySet<string>;
  readonly isRebuild: boolean;
};

export type GraphDetailsDeps = {
  readonly page: PageElements;
  /** The view builders, handed in because `domain-logic` may not import `ui`. */
  readonly views: DetailsViews;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, the panel overlays the canvas. */
  readonly overlay: MediaQueryList;
  readonly onInput: (input: InspectionInput) => void;
  /** The link view was built: ask the host for the manifest entry behind it. */
  readonly onExplain: (source: string, target: string) => void;
  readonly onOpenDetails: (name: string) => void;
  readonly onFocus: (name: string) => void;
  readonly onExclude: (name: string) => void;
  readonly onShow: (name: string) => void;
  /** Each keystroke in the picking filter box. */
  readonly onFilter: (text: string) => void;
  /** `line` is 0-based. */
  readonly onOpenManifest: (packageName: string, line: number) => void;
  readonly onResize: () => void;
  /** After a switch between docked and overlay. */
  readonly onLayout: (isOverlay: boolean) => void;
  /** After the panel opened, and after the resize that came with it. */
  readonly onOpened: () => void;
  readonly onSave: () => void;
};

/** What a view's listeners reach at event time; `context` is `null` until the first `show`. */
export type DetailsEnv = {
  readonly deps: GraphDetailsDeps;
  readonly isOverlay: boolean;
  readonly onClose: () => void;
  readonly context: () => DetailsContext | null;
};

/** The link view's explain block and the state it shows. */
export type ShownExplain = {
  readonly state: ExplainState;
  readonly details: ExplainDetails;
};

/** The canvas hint while picking, and the start and nudge it was built for. */
export type ShownHint = {
  readonly element: HTMLElement;
  readonly start: string;
  readonly isNudged: boolean;
};
