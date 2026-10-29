import type { FolderActions } from './folder-actions.type.ts';
import type { FolderScene } from './folder-scene.type.ts';
import type { GraphFilters } from './graph-filters.type.ts';
import type { GraphView } from './graph-page.type.ts';
import type { Inspection } from './inspection.type.ts';
import type { AnchorBox } from './keep-clear.type.ts';
import type { PackageActions, PackageInspectionActions } from './package-actions.type.ts';
import type { PageElements } from './page-elements.type.ts';
import type { MenuItemModel } from './widget-menu.type.ts';
import type { LayerBounds, MenuTarget, PackageMenuState, RectPx, WidgetViews } from './widget.type.ts';

/** What the widget layer shows, read at each refresh. */
export type WidgetState = {
  readonly scene: FolderScene | null;
  readonly selectedPackage: string | null;
  /** The folder the filters focus, whose Focus folder button is pressed; `null` for a package focus or none. */
  readonly focusedFolder: string | null;
  /** What the selected package's toolbar reads: its Focus state and whether it has a visible task; `null` without a selection. */
  readonly packageState: PackageMenuState | null;
};

export type GraphWidgetsDeps = {
  readonly page: PageElements;
  /** `viewport` is for the menus, which close when the camera moves. */
  readonly view: Pick<GraphView, 'widgetRects' | 'markRowLess' | 'viewport'>;
  readonly widgetViews: WidgetViews;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, the details panel overlays the canvas. */
  readonly overlay: MediaQueryList;
  /** The details panel, once mounted. */
  readonly aside: () => HTMLElement | null;
  readonly state: () => WidgetState;
  readonly actions: FolderActions;
  /** What the package toolbar's Focus, Start trace and Show tasks call. */
  readonly packageActions: PackageActions;
  /** The checkbox's mode and the mode on screen agree, so a widget may act. */
  readonly isActive: () => boolean;
  /** The mode on screen is the checkbox's mode and the package graph owns the canvas, flat or grouped: a package widget may act. */
  readonly isPackageActive: () => boolean;
  readonly onMenu: (target: MenuTarget, opener: HTMLButtonElement) => void;
};

type CanAct = {
  /** The checkbox's mode and the mode on screen are both grouped. */
  readonly canAct: () => boolean;
};

type CanActOnPackage = {
  /** Package mode and the checkbox's mode is the one on screen: a package widget or menu may act, flat or grouped. */
  readonly canActOnPackage: () => boolean;
};

/** What the menus read and call, from the inspection, the controls and the folders. */
export type MenuSources = {
  readonly menuOf: (target: MenuTarget) => MenuItemModel[];
  /** What Shift+F10 opens a menu for: the inspected folder or package, `null` for neither. */
  readonly selection: () => MenuTarget | null;
};

type LocationHook = {
  /** The folder scene was redrawn or grouping turned off: the location bar reads the folder focus again. */
  readonly onLocation: () => void;
};

/**
 * What `wireWidgets` needs: the layer's deps, with `canAct` as the layer's `isActive`, `canActOnPackage` as its
 * `isPackageActive` and the menus as its `onMenu`; the menus check each target (a package against `canActOnPackage`, a
 * folder against `canAct`). It finds the details panel itself.
 */
export type WidgetWireDeps = Omit<GraphWidgetsDeps, 'aside' | 'isActive' | 'isPackageActive' | 'onMenu'> &
  CanAct &
  CanActOnPackage &
  MenuSources &
  LocationHook;

/** Where the layer's state comes from: `GraphFolders` gives the scene, `GraphInspection` the inspection, the selection and the folder actions. */
export type WidgetSources = {
  readonly scene: () => FolderScene | null;
  readonly current: () => Inspection;
  readonly selected: () => string | null;
  readonly folderActions: () => FolderActions;
};

/** The inspection as the widget layer and its menus read and call it. */
export type WidgetInspection = Pick<WidgetSources, 'current' | 'selected' | 'folderActions'> & PackageInspectionActions;

/** The controls' filters, read when a menu opens and on every widget state read, which takes the focused folder from them. */
export type WidgetFilters = {
  readonly applied: GraphFilters;
};

/** The wired layer, as the folder pass, the render loop, the keep-clear pan and the Group by folder checkbox call it. */
export type WidgetWiring = {
  readonly refresh: () => void;
  readonly position: () => void;
  readonly buttonBox: () => AnchorBox | null;
  /** Grouping was turned off: an open menu closes and the location bar follows the cleared focus. */
  readonly groupingOff: () => void;
};

type ParentLink = { readonly parentNode: unknown };

/** The part of a `MutationRecord` the layer's bounds watch reads: where the changed element sits. */
export type BodyRecord = { readonly target: ParentLink };

/** The watch on the layer's bounds: `observeAside` starts observing the Details aside once it exists, and only once per aside. */
export type LayerBoundsWatch = {
  readonly observeAside: () => void;
};

/** What a menu reads off the layer: where it opens from and the area it must stay in. */
export type MenuAnchors = {
  readonly anchorOf: (target: MenuTarget) => MenuAnchor | null;
  readonly layerBounds: () => LayerBounds;
};

type MenuHost = {
  readonly page: PageElements;
  /** `viewport` is the camera a menu opened at, so a move closes it. */
  readonly view: Pick<GraphView, 'widgetRects' | 'viewport'>;
  readonly anchors: MenuAnchors;
  readonly build: WidgetViews['menu'];
  /** The target's widget may act, so Shift+F10 may open its menu. */
  readonly isActive: (target: MenuTarget) => boolean;
};

export type GraphWidgetMenusDeps = Pick<MenuSources, 'menuOf' | 'selection'> & MenuHost;

/** Where a menu opens from: the "…" rect in container px and its button, `null` while hidden. */
export type MenuAnchor = {
  readonly rect: RectPx;
  readonly opener: HTMLButtonElement | null;
};

/** What the package toolbar needs: the layer it leads, the container that takes focus it loses, the builder and the five clicks, already guarded. */
export type PackageToolbarDeps = {
  readonly layer: HTMLElement;
  readonly container: HTMLElement;
  readonly views: WidgetViews;
  readonly onMenu: (target: MenuTarget, opener: HTMLButtonElement) => void;
  readonly onFocus: (name: string) => void;
  readonly onStartTrace: () => void;
  readonly onShowTasks: (name: string) => void;
  readonly onCollapse: (folder: string) => void;
};

/** What the header rows need: the layer, the builders and the four clicks, already guarded. */
export type WidgetRowsDeps = {
  readonly layer: HTMLElement;
  readonly views: WidgetViews;
  readonly onToggle: (folder: string) => void;
  readonly onTitle: (folder: string, event: MouseEvent) => void;
  readonly onFocus: (folder: string) => void;
  readonly onMenu: (target: MenuTarget, opener: HTMLButtonElement) => void;
};
