import type { ControlsElements } from './controls-elements.type.ts';
import type { FolderGroup } from './folder-group.type.ts';
import type { GraphFilters } from './graph-filters.type.ts';
import type { GraphFoldersDeps } from './graph-folders.type.ts';
import type { GraphInspectionDeps } from './graph-inspection.type.ts';
import type { DrawnGraph, PageElements } from './graph-page.type.ts';
import type { WidgetWireDeps } from './graph-widgets.type.ts';

/** What `restoredFilters` rebuilds from a saved state: the filters (the depth with them), the search text, whether the panel opens and whether it is grouped. */
export type RestoredControls = {
  readonly filters: GraphFilters;
  readonly search: string;
  readonly isOpen: boolean;
  readonly isGrouped: boolean;
};

/** One row's look: `isDimmed` means checked but outside the focus or tags; `isLocked` is the focused row. */
export type RowView = {
  readonly isChecked: boolean;
  readonly isDimmed: boolean;
  readonly isLocked: boolean;
};

/** What `renderControls` paints: the filters, the visible set, the package total, the selection, the panel's openness, and whether folders are grouped and which are collapsed. */
export type ControlsView = {
  readonly filters: GraphFilters;
  readonly visible: ReadonlySet<string>;
  readonly total: number;
  readonly selected: string | null;
  readonly isOpen: boolean;
  readonly grouped: boolean;
  readonly collapsed: ReadonlySet<string>;
};

export type GroupState = 'checked' | 'unchecked' | 'mixed';

export type GraphControlsDeps = {
  readonly page: PageElements;
  /** `buildControls`, handed in because `domain-logic` may not import `ui`. */
  readonly build: (groups: FolderGroup[], tags: string[]) => ControlsElements;
  readonly now: () => number;
  /** Only when the visible set changed. */
  readonly onVisibleChange: (visible: ReadonlySet<string>) => void;
  /** A filter change that left the visible set as it was: a view showing the filters, like a folder's Focus, relabels. */
  readonly onSameVisible: () => void;
  /** A package name clicked, or chosen by key, in the list. */
  readonly onSelect: (name: string) => void;
  /** Every focus toggle: the new focus, or `null` when it was cleared; `setFilters` applies it, called once by the receiver. */
  readonly onFocusToggle: (name: string | null, setFilters: () => void) => void;
  readonly onOpenDetails: (name: string) => void;
  /** The Group by folder checkbox changed: the receiver switches the layout, then the controls save. */
  readonly onGrouping: (isGrouped: boolean) => void;
  /** A folder header's Expand or Collapse button was pressed. */
  readonly onToggleFolder: (folder: string) => void;
  /** A folder is about to be focused: the receiver expands it so its packages are drawn. */
  readonly onFolderFocus: (folder: string) => void;
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
  Pick<GraphFoldersDeps, 'measure' | 'isGrouped' | 'canAct'> &
  Pick<WidgetWireDeps, 'widgetViews'>;

/** What the widget layer reads besides the filtering deps: the inspection's list and focus hooks, as the details panel calls them. */
export type WidgetHostDeps = GraphFilteringDeps &
  Pick<GraphInspectionDeps, 'focus' | 'focusedFolder' | 'onFocusOn' | 'onExclude' | 'onShow' | 'onClearFocus' | 'visible'>;

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
  readonly focusFolder: (folder: string) => void;
  readonly clearFocus: () => void;
  readonly focusedFolder: () => string | null;
  readonly setSearch: (mounted: ControlsMounted, text: string) => void;
  readonly setGrouping: (isGrouped: boolean) => void;
  readonly pick: (name: string) => void;
};

/** What the details panel's row actions read and call on `GraphControls`. */
export type ControlsRowsHost = {
  readonly mounted: ControlsMounted | null;
  readonly applied: GraphFilters;
  readonly edit: ControlsOps['edit'];
  readonly focus: ControlsOps['focus'];
};

/** What the panel's listeners ask of `GraphControls`, in the panel's own terms; `names` are a folder's package names. */
export type ControlsActions = {
  readonly onRow: (name: string, isChecked: boolean) => void;
  readonly onGroup: (names: string[], isChecked: boolean) => void;
  readonly onFocus: (name: string) => void;
  readonly onDepth: (text: string) => void;
  readonly onDepthBlur: () => void;
  readonly onGrouping: (isGrouped: boolean) => void;
  readonly onToggle: (folder: string) => void;
  readonly onFolderFocus: (folder: string) => void;
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
