import { GraphWidgetMenus } from './graph-widget-menus.ts';
import { GraphWidgets } from './graph-widgets.ts';
import type {
  GraphWidgetMenusDeps,
  GraphWidgetsDeps,
  MenuAnchor,
  MenuAnchors,
  WidgetWireDeps,
  WidgetWiring
} from '../common/graph-widgets.type.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { LayerBounds, MenuTarget } from '../common/widget.type.ts';
import { isMenuOpenKey } from '../utils/menu-keys.util.ts';
import { wheelInitOf } from '../utils/wheel-init.util.ts';

/** The Details aside, a direct child of the body; `children` is what the specs' fake elements answer. */
const asideOf = (body: HTMLElement): HTMLElement | null => {
  const children = Array.from(body.children);
  const aside = children.find((child) => child.id === DETAILS_ID);

  return aside instanceof HTMLElement ? aside : null;
};

/**
 * Re-reads the layer's bounds when the container or the Details aside resizes. The aside mounts with the first graph, so
 * it is looked up on every refresh and observed the first time it exists; a Details drag over the canvas moves the aside's
 * left edge without resizing the container.
 */
class BoundsWatch {
  private readonly body: HTMLElement;
  private readonly widgets: GraphWidgets;
  private readonly resizes = new ResizeObserver((): void => this.refresh());
  private observed: Element | null = null;

  public constructor(body: HTMLElement, widgets: GraphWidgets) {
    this.body = body;
    this.widgets = widgets;
  }

  public observe(container: HTMLElement): void {
    this.resizes.observe(container);
  }

  public observeAside(): void {
    const aside = asideOf(this.body);

    if (aside === null || aside === this.observed) return;

    this.resizes.observe(aside);
    this.observed = aside;
  }

  public refresh(): void {
    this.observeAside();
    this.widgets.refreshBounds();
  }
}

/** A record that can move the container or the overlay: a direct child of the body shown or hidden. */
const isBodyRecord = (record: MutationRecord, body: HTMLElement): boolean => record.target.parentNode === body;

/** Whether a target's widget may act: a package's in either mode, a folder's only grouped. */
const menuActiveOf = (deps: WidgetWireDeps): ((target: MenuTarget) => boolean) => {
  const isActive = (target: MenuTarget): boolean => {
    if (target.kind === 'package') return deps.canActOnPackage();

    return deps.canAct();
  };

  return isActive;
};

/** The layer and its menus, built together: a "…" click opens a menu, and a menu reads its anchor off the layer. */
class WidgetParts {
  public readonly widgets: GraphWidgets;
  public readonly menus: GraphWidgetMenus;

  public constructor(deps: WidgetWireDeps) {
    const { page, widgetViews, canAct, canActOnPackage } = deps;
    const layerDeps: GraphWidgetsDeps = {
      ...deps,
      aside: (): HTMLElement | null => asideOf(page.body),
      isActive: canAct,
      isPackageActive: canActOnPackage,
      onMenu: (target, opener): void => this.menus.open(target, opener)
    };
    const anchors: MenuAnchors = {
      anchorOf: (target): MenuAnchor | null => this.widgets.anchorOf(target),
      layerBounds: (): LayerBounds => this.widgets.layerBounds()
    };
    const isMenuActive = menuActiveOf(deps);
    const menusDeps: GraphWidgetMenusDeps = { ...deps, anchors, build: widgetViews.menu, isActive: isMenuActive };

    this.widgets = new GraphWidgets(layerDeps);
    this.menus = new GraphWidgetMenus(menusDeps);
  }
}

/** Whether the wheel was aimed at an open widget menu, which keeps it for itself. */
const isWheelOverMenu = (event: WheelEvent): boolean => {
  const { target } = event;

  if (!(target instanceof Element)) return false;

  const menu = target.closest('.widget-menu');

  return menu !== null;
};

/** A wheel over a widget zooms the canvas through a copy on the container; over an open menu it does nothing. */
const widgetWheelOf = (container: HTMLElement): ((event: WheelEvent) => void) => {
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const isOverMenu = isWheelOverMenu(event);

    if (isOverMenu) return;

    container.dispatchEvent(new WheelEvent('wheel', wheelInitOf(event)));
  };

  return onWheel;
};

/**
 * Builds the widget layer and its menus, and re-reads the layer's bounds when the container resizes, the
 * overlay query flips, or a panel of the body opens or closes; a `hidden` flip deeper in the body (a list row) costs
 * nothing. The details panel mounts with the first graph, so the Details aside is looked up on every refresh and watched from
 * then on: a sash drag moves its left edge over the canvas without resizing the container.
 * Shift+F10 or the ContextMenu key on the canvas or the layer opens the selection's menu, and the browser's own context
 * menu never opens over them. A wheel over a widget zooms the canvas, one over an open menu does nothing.
 */
export const wireWidgets = (deps: WidgetWireDeps): WidgetWiring => {
  const { page, overlay } = deps;
  const { body, container, widgets: layer } = page;
  const { widgets, menus } = new WidgetParts(deps);
  const bounds = new BoundsWatch(body, widgets);
  const refreshBounds = (): void => bounds.refresh();
  const onMutations = (records: MutationRecord[]): void => {
    const isBodyChange = records.some((record) => isBodyRecord(record, body));

    if (isBodyChange) refreshBounds();
  };
  const onMenuKey = (event: KeyboardEvent): void => {
    const isOpenKey = isMenuOpenKey(event.key, event.shiftKey);

    if (isOpenKey) menus.openForSelection();
  };
  const onContextMenu = (event: MouseEvent): void => {
    const { activeElement } = document;
    const isInContainer = container.contains(activeElement);
    const isInLayer = layer.contains(activeElement);

    if (isInContainer || isInLayer) event.preventDefault();
  };
  const wiring: WidgetWiring = {
    refresh: (): void => {
      bounds.observeAside();
      widgets.refresh();
      deps.onLocation();
    },
    position: (): void => {
      widgets.position();
      menus.follow();
    },
    buttonBox: (): AnchorBox | null => widgets.packageToolbarBox(),
    groupingOff: (): void => {
      menus.drop();
      deps.onLocation();
    }
  };

  bounds.observe(container);
  new MutationObserver(onMutations).observe(body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  overlay.addEventListener('change', refreshBounds);
  container.addEventListener('keydown', onMenuKey);
  layer.addEventListener('keydown', onMenuKey);
  layer.addEventListener('wheel', widgetWheelOf(container), { passive: false });
  document.addEventListener('contextmenu', onContextMenu);

  return wiring;
};
