import type { DetailsViews } from './details.type.ts';
import type { ControlsViewFields, DrawnGraph, GraphView, PageElements, ViewStateSaver } from './graph-page.type.ts';
import type { Inspection, InspectionInput } from './inspection.type.ts';
import type { KeepClearTrigger } from './keep-clear.type.ts';
import type { TraceCandidates, TraceResult } from './trace.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';

/** What a same-hash state does: relabel the shown package in place, and ask again for the shown link's entry. */
export type SameHashPlan = {
  readonly isUpdate: boolean;
  readonly isReask: boolean;
};

/** What the canvas draws for an inspection: the graph and visible set it was built for, its trace and its candidates. */
export type CanvasShown = {
  readonly inspection: Inspection;
  readonly drawn: DrawnGraph;
  readonly visible: ReadonlySet<string>;
  readonly trace: TraceResult | null;
  readonly candidates: TraceCandidates | null;
};

/** What a save writes besides the camera and the controls: the inspection and whether Details is open. */
export type InspectionSave = {
  readonly inspection: Inspection;
  readonly detailsOpen: boolean;
};

export type GraphInspectionDeps = {
  readonly bridge: Bridge;
  readonly page: PageElements;
  readonly view: GraphView;
  readonly saver: ViewStateSaver;
  readonly now: () => number;
  /** The details view builders, handed in because `domain-logic` may not import `ui`. */
  readonly views: DetailsViews;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, the details panel overlays the canvas. */
  readonly overlay: MediaQueryList;
  /** The graph shown or being laid out; `null` while the page shows no graph. */
  readonly drawn: () => DrawnGraph | null;
  /** The package names the controls leave visible. */
  readonly visible: () => ReadonlySet<string>;
  /** The focused package, `null` with no focus. */
  readonly focus: () => string | null;
  /** The controls fields every save carries along. */
  readonly controls: () => ControlsViewFields;
  /** The inspected package changed or was forgotten; `null` for none. */
  readonly onSelected: (name: string | null) => void;
  readonly onFocusOn: (name: string) => void;
  readonly onExclude: (name: string) => void;
  readonly onShow: (name: string) => void;
  /** Whether "Show" can re-tick `name` alone to draw it again. */
  readonly canShow: (name: string) => boolean;
};

/** What the keep-clear pan reads: the canvas, the page's container and details aside, and the inspection's anchors. */
export type KeepClearDeps = {
  readonly view: GraphView;
  readonly page: PageElements;
  readonly inspection: Inspection;
};

/** What the details panel, `Clear selection` and the container's keys ask of `GraphInspection`. */
export type InspectionActions = {
  readonly input: (input: InspectionInput) => void;
  /** Each keystroke in the picking filter box. */
  readonly filter: (text: string) => void;
  readonly openDetails: () => void;
  readonly save: () => void;
  readonly keepClear: (trigger: KeepClearTrigger) => void;
};
