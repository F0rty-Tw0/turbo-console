import type { BreadcrumbElements, MenuElements, MenuItemModel } from './widget-menu.type.ts';

/** A rectangle in container px, as Cytoscape's `renderedBoundingBox`. */
export type RectPx = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

/** A drawn box or collapsed node: its rendered rect, and the rect's width with the plain border `selected` and `highlighted` thicken. */
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

/** What a folder's menu reads: its collapse, whether it is the focus, and its "Show folder" state. */
export type FolderMenuState = {
  readonly isCollapsed: boolean;
  readonly isFocus: boolean;
  readonly show: ShowFolderState;
};

/** What a package's menu reads: whether it is the focus, whether its list checkbox is ticked, and whether it has a visible task. */
export type PackageMenuState = {
  readonly isFocus: boolean;
  readonly isShown: boolean;
  readonly hasTasks: boolean;
};

export type RowButtonRects = {
  readonly chevron: RectPx;
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
  readonly isGrouped: boolean;
};

/** A header row with at least one shown button. */
export type RowPlan = {
  readonly folder: string;
  readonly kind: RowKind;
  readonly placement: RowPlacement;
  readonly isChevronShown: boolean;
  readonly isEllipsisShown: boolean;
};

/** One positioning pass: the rows to show and the shown package "…", `null` when none. */
export type WidgetPlan = {
  readonly rows: RowPlan[];
  readonly packageButton: RectPx | null;
};

/** One folder's header row: the chevron and "…", and for a box also its title and count. */
export type FolderRowElements = {
  readonly root: HTMLElement;
  readonly chevron: HTMLButtonElement;
  readonly ellipsis: HTMLButtonElement;
};

/** The widget builders, handed in because `domain-logic` may not import `ui`. */
export type WidgetViews = {
  /** `title` is the shown folder title; `count` the folder's package count, shown on a box row only. */
  readonly row: (kind: RowKind, title: string, count: number) => FolderRowElements;
  readonly packageButton: (name: string) => HTMLButtonElement;
  /** `label` is the menu's accessible name, the one its "…" has. */
  readonly menu: (model: MenuItemModel[], label: string) => MenuElements;
  readonly breadcrumb: () => BreadcrumbElements;
  /** One muted breadcrumb line; `hasIcon` puts the `info` Codicon before it. */
  readonly breadcrumbLine: (text: string, hasIcon: boolean) => HTMLElement;
};
