import type { ControlsElements } from './controls-elements.type.ts';
import type { FolderGroup } from './folder-group.type.ts';
import type { GraphFilters } from './graph-filters.type.ts';
import type { GraphSelectionDeps, PageElements } from './graph-page.type.ts';

/** What `restoredFilters` rebuilds from a saved state: the filters, the two inputs' values and whether the panel opens. */
export type RestoredControls = {
  readonly filters: GraphFilters;
  readonly search: string;
  readonly depth: number;
  readonly isOpen: boolean;
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
  /** `pan` is true for a click on a package name. */
  readonly onSelect: (name: string, pan: boolean) => void;
  readonly onOpenDetails: (name: string) => void;
  readonly onSave: () => void;
  readonly onResize: () => void;
};

/** What `GraphFiltering` needs to own the selection and the controls: the selection's deps, the clock and `build`. */
export type GraphFilteringDeps = Pick<GraphSelectionDeps, 'bridge' | 'page' | 'view' | 'saver' | 'drawn'> &
  Pick<GraphControlsDeps, 'build' | 'now'>;

/** What the panel's listeners ask of `GraphControls`, in the panel's own terms; `names` are a folder's package names. */
export type ControlsActions = {
  readonly onRow: (name: string, isChecked: boolean) => void;
  readonly onGroup: (names: string[], isChecked: boolean) => void;
  readonly onFocus: (name: string) => void;
  readonly onDepth: (text: string) => void;
  readonly onDepthBlur: () => void;
  readonly onTag: (tag: string, isChecked: boolean) => void;
  readonly onShowAll: () => void;
  readonly onSearch: (text: string) => void;
  readonly onPick: (name: string) => void;
};

/** What the package list's keyboard asks of `GraphControls`; `pan` is true for a select by key. */
export type KeyboardDeps = {
  readonly isVisible: (name: string) => boolean;
  readonly selected: () => string | null;
  readonly onSelect: (name: string, pan: boolean) => void;
  readonly onOpenDetails: (name: string) => void;
};
