import type {
  EmptyDetails,
  ExplainDetails,
  FolderViewElements,
  LinkDetails,
  PackageDetails,
  PickingDetails,
  TraceDetails
} from './details-view.type.ts';
import type { DetailsViews, ExplainState } from './details.type.ts';
import type { FolderScene } from './folder-scene.type.ts';
import type { DrawnGraph } from './graph-page.type.ts';
import type { Inspection, InspectionInput, PickingInspection, TraceInspection } from './inspection.type.ts';
import type { PageElements } from './page-elements.type.ts';
import type { TraceCandidates, TraceResult } from './trace.type.ts';

/** How `show` changes the panel: a new view, the shown view updated in place, or the same view built again. */
export type DetailsPlan = 'swap' | 'update' | 'rebuild';

/** How an explain reply changes the explain block: updated in place, or built again. */
export type ExplainPlan = 'update' | 'rebuild';

/** Where focus goes after a list is rebuilt in place: the item with the same name, the view heading, or nowhere. */
export type Refocus = 'item' | 'heading' | 'none';

/** One view of the details panel. */
export type DetailsView = EmptyDetails | PackageDetails | LinkDetails | PickingDetails | TraceDetails | FolderViewElements;

type PickingParts = { readonly candidates: TraceCandidates };

type TraceParts = { readonly trace: TraceResult };

/** A picking with its full, unfiltered end candidates. */
export type ShownPicking = PickingInspection & PickingParts;

/** A trace with the path it walked. */
export type ShownTrace = TraceInspection & TraceParts;

/** The inspection the panel shows; a picking and a trace carry what their views are built from. */
export type ShownInspection = Exclude<Inspection, PickingInspection | TraceInspection> | ShownPicking | ShownTrace;

/** What the views are built from besides the inspection: `showable` holds the path packages whose Show is allowed; `isRebuild` builds the shown view again; `scene` is `null` while flat. */
export type DetailsContext = {
  readonly drawn: DrawnGraph;
  readonly visible: ReadonlySet<string>;
  readonly focus: string | null;
  readonly showable: ReadonlySet<string>;
  readonly isRebuild: boolean;
  readonly scene: FolderScene | null;
  readonly focusedFolder: string | null;
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
  readonly onShowTasks: (name: string) => void;
  readonly hasTasks: (name: string) => boolean;
  /** The folder view's Expand or Collapse. */
  readonly onToggleFolder: (folder: string) => void;
  /** The folder view's Focus folder, which reads Clear focus while the folder is the focus. */
  readonly onFocusFolder: (folder: string) => void;
  readonly onExcludeFolder: (folder: string) => void;
  /** Each keystroke in the picking filter box. */
  readonly onFilter: (text: string) => void;
  /** `line` is 0-based. */
  readonly onOpenManifest: (packageName: string, line: number) => void;
  readonly onResize: () => void;
  /** The Details button opens and closes this panel only while the package graph owns the canvas. */
  readonly isPackageMode: () => boolean;
  /** After a switch between docked and overlay. */
  readonly onLayout: () => void;
  /** After the panel opened, and after the resize that came with it. */
  readonly onOpened: () => void;
  readonly onSave: () => void;
};

/** What a view's listeners reach at event time; `shown` and `context` are `null` until the first `show`. */
export type DetailsEnv = {
  readonly deps: GraphDetailsDeps;
  readonly isOverlay: boolean;
  readonly onClose: () => void;
  readonly shown: () => ShownInspection | null;
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
