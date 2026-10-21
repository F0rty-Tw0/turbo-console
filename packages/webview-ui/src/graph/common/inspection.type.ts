import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

type NoInspection = { readonly kind: 'none' };

type PackageInspection = { readonly kind: 'package'; readonly name: string };

export type LinkInspection = { readonly kind: 'link'; readonly source: string; readonly target: string };

type PickingInspection = { readonly kind: 'picking'; readonly start: string; readonly isNudged: boolean };

export type TraceInspection = { readonly kind: 'trace'; readonly start: string; readonly end: string };

/** What the graph page is showing details of: nothing, a package, a link, a trace being picked, or a trace. */
export type Inspection = NoInspection | PackageInspection | LinkInspection | PickingInspection | TraceInspection;

/** Where a package was chosen; the controller reads it to decide whether to pan, the result never depends on it. */
export type SelectVia = 'canvas' | 'list' | 'search' | 'panel';

/** Where Escape was pressed. */
export type EscapeWhere = 'canvas' | 'panel';

/** Inputs that carry no data beyond their kind. */
export type PlainInputKind = 'background' | 'clear' | 'startTrace' | 'cancel' | 'clearTrace' | 'swapEnds';

/** A package chosen from the canvas, the list, the search or the panel. */
type SelectInput = { readonly kind: 'select'; readonly name: string; readonly via: SelectVia };

/** A trace-end candidate chosen while picking. */
type PickInput = { readonly kind: 'pick'; readonly name: string };

/** A link tapped, or its explain action pressed; both act the same. */
type LinkInput = { readonly kind: 'tapLink' | 'explain'; readonly source: string; readonly target: string };

/** An input that carries nothing beyond its kind. */
export type PlainInput = { readonly kind: PlainInputKind };

/** Escape pressed on the canvas or in the panel. */
type EscapeInput = { readonly kind: 'escape'; readonly where: EscapeWhere };

/** What the user did that can change the inspection. */
export type InspectionInput = SelectInput | PickInput | LinkInput | PlainInput | EscapeInput;

/** The part of the saved view state that holds the inspection. */
export type InspectionFields = Pick<GraphViewState, 'selected' | 'link' | 'trace'>;
