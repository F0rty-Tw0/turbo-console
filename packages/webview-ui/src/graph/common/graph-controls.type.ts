import type { ControlsElements } from './controls-elements.type.ts';
import type { FolderGroup } from './folder-group.type.ts';
import type { GraphFilters } from './graph-filters.type.ts';
import type { GraphFoldersDeps } from './graph-folders.type.ts';
import type { GraphInspectionDeps } from './graph-inspection.type.ts';
import type { DrawnGraph, PageElements } from './graph-page.type.ts';

/** What `restoredFilters` rebuilds from a saved state: the filters, the two inputs' values, whether the panel opens and whether it is grouped. */
export type RestoredControls = {
  readonly filters: GraphFilters;
  readonly search: string;
  readonly depth: number;
  readonly isOpen: boolean;
  readonly isGrouped: boolean;
};

/** One row's look: `isDimmed` means checked but outside the focus or tags; `isLocked` is the focused row. */
export type RowView = {
  readonly isChecked: boolean;
  readonly isDimmed: boolean;
  readonly isLocked: boolean;
};

/** What `renderControls` paints: the filters, the visible set, the package total, the selection and the panel's openness. */
export type ControlsView = {
  readonly filters: GraphFilters;
  readonly visible: ReadonlySet<string>;
  readonly total: number;
  readonly selected: string | null;
  readonly isOpen: boolean;
};

export type GroupState = 'checked' | 'unchecked' | 'mixed';

export type GraphControlsDeps = {
  readonly page: PageElements;
  /** `buildControls`, handed in because `domain-logic` may not import `ui`. */
  readonly build: (groups: FolderGroup[], tags: string[]) => ControlsElements;
  readonly now: () => number;
  /** Only when the visible set changed. */
  readonly onVisibleChange: (visible: ReadonlySet<string>) => void;
  /** A package name clicked, or chosen by key, in the list. */
  readonly onSelect: (name: string) => void;
  /** Every focus toggle: the new focus, or `null` when it was cleared; `setFilters` applies it, called once by the receiver. */
  readonly onFocusToggle: (name: string | null, setFilters: () => void) => void;
  readonly onOpenDetails: (name: string) => void;
  /** The Group by folder checkbox changed: the receiver switches the layout, then the controls save. */
  readonly onGrouping: (isGrouped: boolean) => void;
  readonly onSave: () => void;
  /** Re-measures the canvas now; Cytoscape's own observers wait a 100 ms debounce. */
  readonly onResize: () => void;
};

/** What `GraphFiltering` needs to own the inspection, the controls and the folders: their deps it cannot build itself. */
export type GraphFilteringDeps = Pick<
  GraphInspectionDeps,
  'bridge' | 'page' | 'view' | 'saver' | 'drawn' | 'now' | 'views' | 'overlay'
> &
  Pick<GraphControlsDeps, 'build' | 'onGrouping'> &
  Pick<GraphFoldersDeps, 'measure' | 'isGrouped' | 'canAct'>;

/** The controls panel built for one graph. */
export type ControlsMounted = {
  readonly graph: DrawnGraph;
  readonly elements: ControlsElements;
};

/** What the panel's actions call on `GraphControls`; `applied` and `depth` are read at event time. */
export type ControlsOps = {
  readonly applied: GraphFilters;
  readonly depth: number;
  readonly edit: (mounted: ControlsMounted, next: GraphFilters) => void;
  readonly change: (mounted: ControlsMounted, next: GraphFilters) => void;
  readonly focus: (mounted: ControlsMounted, name: string) => void;
  readonly setDepth: (mounted: ControlsMounted, text: string) => void;
  readonly showAll: (mounted: ControlsMounted) => void;
  readonly setSearch: (mounted: ControlsMounted, text: string) => void;
  readonly setGrouping: (isGrouped: boolean) => void;
  readonly pick: (name: string) => void;
};

/** What the panel's listeners ask of `GraphControls`, in the panel's own terms; `names` are a folder's package names. */
export type ControlsActions = {
  readonly onRow: (name: string, isChecked: boolean) => void;
  readonly onGroup: (names: string[], isChecked: boolean) => void;
  readonly onFocus: (name: string) => void;
  readonly onDepth: (text: string) => void;
  readonly onDepthBlur: () => void;
  readonly onGrouping: (isGrouped: boolean) => void;
  readonly onTag: (tag: string, isChecked: boolean) => void;
  readonly onShowAll: () => void;
  readonly onSearch: (text: string) => void;
  readonly onPick: (name: string) => void;
};

/** What the package list's keyboard asks of `GraphControls`. */
export type KeyboardDeps = {
  readonly isVisible: (name: string) => boolean;
  readonly selected: () => string | null;
  readonly onSelect: (name: string) => void;
  readonly onOpenDetails: (name: string) => void;
};
