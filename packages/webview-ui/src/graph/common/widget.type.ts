import type { LocationViews } from './location.type.ts';
import type { MenuElements, MenuItemModel } from './widget-menu.type.ts';

/** A rectangle in container px, as Cytoscape's `renderedBoundingBox`. */
export type RectPx = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

/** A drawn box or collapsed node: its rendered rect, and the rect's width at the plain border, which `selected` thickens. */
export type FolderRect = {
  readonly rect: RectPx;
  readonly width: number;
};

export type Point = {
  readonly x: number;
  readonly y: number;
};

export type Size = {
  readonly width: number;
  readonly height: number;
};

export type RowKind = 'box' | 'collapsed';

/** A header row's left edge, top edge and unscaled CSS width; the row is `WIDGET_BUTTON_PX` high before its scale. */
export type RowPlacement = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** Drawn at this scale from its top left, so it spans `width · scale` px. */
  readonly scale: number;
};

/** The widget layer's size and, when the details panel overlays the canvas, the container x where it starts. */
export type LayerBounds = {
  readonly width: number;
  readonly height: number;
  readonly overlayLeft: number | null;
};

export type ShowFolderState = {
  readonly checked: 'true' | 'false' | 'mixed';
  readonly isDisabled: boolean;
};

/** What a folder's menu reads: its collapse, whether it is the focus, and its packages' group checkbox state. */
export type FolderMenuState = {
  readonly isCollapsed: boolean;
  readonly isFocus: boolean;
  readonly show: ShowFolderState;
};

/** What a package's menu reads: whether it is the focus and whether it has a visible task. */
export type PackageMenuState = {
  readonly isFocus: boolean;
  readonly hasTasks: boolean;
};

/** Which of the package toolbar's buttons show besides the "…", which always shows. */
export type PackageToolbarShown = {
  readonly focus: boolean;
  readonly startTrace: boolean;
  readonly showTasks: boolean;
  readonly collapse: boolean;
};

export type RowButtonRects = {
  readonly chevron: RectPx;
  readonly focus: RectPx;
  readonly ellipsis: RectPx;
};

/** The drawn folder boxes and collapsed nodes by folder key, and the selected package while drawn; container px. */
export type WidgetRects = {
  readonly boxes: ReadonlyMap<string, FolderRect>;
  readonly collapsed: ReadonlyMap<string, FolderRect>;
  readonly selected: RectPx | null;
  /** The camera zoom the rects were read at. */
  readonly zoom: number;
};

type FolderMenuTarget = {
  readonly kind: 'folder';
  readonly folder: string;
};

type PackageMenuTarget = {
  readonly kind: 'package';
  readonly name: string;
};

/** What a "…" opens a menu for. */
export type MenuTarget = FolderMenuTarget | PackageMenuTarget;

export type WidgetPlanInput = {
  readonly rects: WidgetRects;
  readonly bounds: LayerBounds;
  /** How many buttons the full node toolbar shows. */
  readonly toolbarCount: number;
};

/** A header row with at least one shown button. */
export type RowPlan = {
  readonly folder: string;
  readonly kind: RowKind;
  readonly placement: RowPlacement;
  readonly isChevronShown: boolean;
  readonly isFocusShown: boolean;
  readonly isEllipsisShown: boolean;
};

/** One positioning pass: the rows to show and the shown node toolbar, `null` when none. */
export type WidgetPlan = {
  readonly rows: RowPlan[];
  /** The shown node toolbar's rect. */
  readonly nodeToolbar: RectPx | null;
};

/** One folder's header row: the chevron, title button, Focus folder and "…"; the glyph and count badge sit between them. */
export type FolderRowElements = {
  readonly root: HTMLElement;
  readonly chevron: HTMLButtonElement;
  readonly title: HTMLButtonElement;
  readonly focus: HTMLButtonElement;
  readonly ellipsis: HTMLButtonElement;
};

/** The selected package's node toolbar: its root and the buttons it holds, `collapse` only for a package in a folder. */
export type PackageToolbarElements = {
  readonly root: HTMLElement;
  readonly focus: HTMLButtonElement;
  readonly startTrace: HTMLButtonElement;
  readonly showTasks: HTMLButtonElement;
  readonly collapse: HTMLButtonElement | null;
  readonly ellipsis: HTMLButtonElement;
};

/** The package toolbar's buttons; collapse has no button on a flat page. */
export type PackageToolbarKind = Exclude<keyof PackageToolbarElements, 'root'>;

/** The toolbar built for `name` in `folder` (`null` on a flat page), with the state it was last synced to. */
export type ToolbarEntry = {
  readonly name: string;
  readonly folder: string | null;
  readonly state: PackageMenuState;
  readonly elements: PackageToolbarElements;
  /** The buttons the last placement showed, in DOM order. */
  shown: PackageToolbarKind[];
  /** The Tab stop an arrow key or focus last moved to; Focus until one does. */
  preferred: PackageToolbarKind;
};

/** A widget's buttons by kind; a kind without a button is `null`. */
export type RovingButtons<TKind extends string> = Readonly<Record<TKind, HTMLButtonElement | null>>;

/** A widget with one Tab stop the arrow keys move: a toolbar entry or a row entry. */
export type RovingEntry<TKind extends string> = {
  readonly elements: RovingButtons<TKind>;
  /** The buttons the last placement showed, in DOM order. */
  shown: TKind[];
  /** The Tab stop the widget returns to while it shows. */
  preferred: TKind;
};

/** The four buttons of a row; the glyph and badge are not buttons. */
export type RowButtonKind = Exclude<keyof FolderRowElements, 'root'>;

/** A built row as the layer keeps it. */
export type RowEntry = {
  readonly kind: RowKind;
  /** The package count the row was built with. */
  readonly count: number;
  readonly elements: FolderRowElements;
  /** The buttons the last placement showed, in DOM order. */
  shown: RowButtonKind[];
  /** The Tab stop an arrow key last moved to; the chevron until one does. */
  preferred: RowButtonKind;
};

/** The widget builders, handed in because `domain-logic` may not import `ui`. */
export type WidgetViews = {
  /** `title` is the shown folder title; `count` the folder's package count, shown on a box row only. */
  readonly row: (kind: RowKind, title: string, count: number) => FolderRowElements;
  readonly packageButton: (name: string) => HTMLButtonElement;
  /** `folderTitle` is the shown title of the package's folder, `null` on a flat page. */
  readonly packageToolbar: (name: string, folderTitle: string | null) => PackageToolbarElements;
  /** `label` is the menu's accessible name, the one its "…" has. */
  readonly menu: (model: MenuItemModel[], label: string) => MenuElements;
  readonly location: LocationViews;
};
