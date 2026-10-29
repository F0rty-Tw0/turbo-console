import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

type NoInspection = { readonly kind: 'none' };

type PackageInspection = { readonly kind: 'package'; readonly name: string };

export type LinkInspection = { readonly kind: 'link'; readonly source: string; readonly target: string };

export type PickingInspection = { readonly kind: 'picking'; readonly start: string; readonly isNudged: boolean };

export type FolderInspection = { readonly kind: 'folder'; readonly folder: string };

export type BundleInspection = { readonly kind: 'bundle'; readonly source: string; readonly target: string };

export type TraceInspection = { readonly kind: 'trace'; readonly start: string; readonly end: string };

/** What the graph page is showing details of: nothing, a package, a link, a folder, a bundled folder link, a trace being picked, or a trace. */
export type Inspection =
  NoInspection | PackageInspection | LinkInspection | FolderInspection | BundleInspection | PickingInspection | TraceInspection;

/**
 * Where a package was chosen: the list (its search's Enter included), the panel, the canvas, or a list Focus toggle.
 * `shouldPan` pans for the list and the panel only; while picking, a panel select never ends the picking.
 */
export type SelectVia = 'canvas' | 'list' | 'panel' | 'focus';

/** Where Escape was pressed. */
export type EscapeWhere = 'canvas' | 'panel';

/** Inputs that carry no data beyond their kind. */
export type PlainInputKind = 'background' | 'clear' | 'startTrace' | 'cancel' | 'clearTrace' | 'swapEnds';

/** A package chosen from the canvas, the list, the panel or by a list Focus toggle. */
type SelectInput = { readonly kind: 'select'; readonly name: string; readonly via: SelectVia };

/** A trace-end candidate chosen while picking. */
type PickInput = { readonly kind: 'pick'; readonly name: string };

/** A link tapped, or its explain action pressed; both act the same. */
type LinkInput = { readonly kind: 'tapLink' | 'explain'; readonly source: string; readonly target: string };

/** An input that carries nothing beyond its kind. */
export type PlainInput = { readonly kind: PlainInputKind };

/** A folder chosen from a box, a collapsed node, a list header or a menu; ignored while picking. */
type FolderInput = { readonly kind: 'selectFolder'; readonly folder: string };

/** A bundled folder link tapped; its ends are drawn ids, a package name or `collapsedIdOf(folder)`. */
type BundleInput = { readonly kind: 'tapBundle'; readonly source: string; readonly target: string };

/** Escape pressed on the canvas or in the panel. */
type EscapeInput = { readonly kind: 'escape'; readonly where: EscapeWhere };

/** What the user did that can change the inspection. */
export type InspectionInput = SelectInput | PickInput | LinkInput | FolderInput | BundleInput | PlainInput | EscapeInput;

/** The part of the saved view state that holds the inspection. */
export type InspectionFields = Pick<GraphViewState, 'selected' | 'link' | 'trace' | 'folder'>;
