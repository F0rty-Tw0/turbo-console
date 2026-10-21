import type { DetailsViews } from './details.type.ts';
import type { ControlsViewFields, DrawnGraph, GraphView, PageElements, ViewStateSaver } from './graph-page.type.ts';
import type { ProbeFacts } from './graph-probe.type.ts';
import type { Inspection, InspectionInput } from './inspection.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';

/** What a same-hash state does: relabel the shown package in place, and ask again for the shown link's entry. */
export type SameHashPlan = {
  readonly isUpdate: boolean;
  readonly isReask: boolean;
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
};

/** What the details panel, `Clear selection` and the container's keys ask of `GraphInspection`. */
export type InspectionActions = {
  readonly input: (input: InspectionInput) => void;
  /** Each keystroke in the picking filter box. */
  readonly filter: (text: string) => void;
  readonly openDetails: () => void;
  readonly save: () => void;
};

/** The probe facts `GraphInspection` knows. */
export type InspectionFacts = Pick<ProbeFacts, 'selected' | 'inspection' | 'detailsBuiltMs' | 'pickingBuiltMs' | 'traceMs'>;
