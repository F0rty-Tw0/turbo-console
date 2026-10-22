import type { FolderActions } from './folder-actions.type.ts';
import type { FolderScene } from './folder-scene.type.ts';
import type { GraphView, PageElements } from './graph-page.type.ts';
import type { AnchorBox } from './keep-clear.type.ts';
import type { MenuTarget, RectPx, WidgetViews } from './widget.type.ts';

/** What the widget layer shows, read at each refresh. */
export type WidgetState = {
  /** The mode on screen is grouped. */
  readonly isGrouped: boolean;
  readonly scene: FolderScene | null;
  readonly selectedPackage: string | null;
};

export type GraphWidgetsDeps = {
  readonly page: PageElements;
  readonly view: Pick<GraphView, 'widgetRects'>;
  readonly widgetViews: WidgetViews;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, the details panel overlays the canvas. */
  readonly overlay: MediaQueryList;
  /** The details panel, once mounted. */
  readonly aside: () => HTMLElement | null;
  readonly state: () => WidgetState;
  readonly actions: FolderActions;
  /** The checkbox's mode and the mode on screen agree, so a widget may act. */
  readonly isActive: () => boolean;
  readonly onMenu: (target: MenuTarget, opener: HTMLButtonElement) => void;
};

type CanAct = {
  /** The checkbox's mode and the mode on screen are both grouped. */
  readonly canAct: () => boolean;
};

/** What `wireWidgets` needs: the layer's deps, with `canAct` as the layer's `isActive`; it finds the details panel itself. */
export type WidgetWireDeps = Omit<GraphWidgetsDeps, 'aside' | 'isActive'> & CanAct;

/** Where the layer's state comes from: `GraphFolders` gives the scene, `GraphInspection` the selection and the folder actions. */
export type WidgetSources = {
  readonly scene: () => FolderScene | null;
  readonly selected: () => string | null;
  readonly folderActions: () => FolderActions;
};

/** The wired layer, as the folder pass, the render loop and the keep-clear pan call it. */
export type WidgetWiring = {
  readonly refresh: () => void;
  readonly position: () => void;
  readonly buttonBox: () => AnchorBox | null;
};

/** Where a menu opens from: the "…" rect in container px and its button, `null` while hidden. */
export type MenuAnchor = {
  readonly rect: RectPx;
  readonly opener: HTMLButtonElement | null;
};

/** What the header rows need: the layer, the builders and the two clicks, already guarded. */
export type WidgetRowsDeps = {
  readonly layer: HTMLElement;
  readonly views: WidgetViews;
  readonly onToggle: (folder: string) => void;
  readonly onMenu: (target: MenuTarget, opener: HTMLButtonElement) => void;
};
