import { GraphBreadcrumb } from './graph-breadcrumb.ts';
import { GraphWidgetMenus } from './graph-widget-menus.ts';
import { GraphWidgets } from './graph-widgets.ts';
import type {
  GraphBreadcrumbDeps,
  GraphWidgetMenusDeps,
  GraphWidgetsDeps,
  MenuAnchor,
  MenuAnchors,
  WidgetWireDeps,
  WidgetWiring
} from '../common/graph-widgets.type.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { LayerBounds } from '../common/widget.type.ts';
import { isMenuOpenKey } from '../utils/menu-keys.util.ts';

const DETAILS_SELECTOR = `#${DETAILS_ID}`;

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

  /** The aside is a direct child of the body; `children` is what the specs' fake elements answer. */
  public observeAside(): void {
    const children = Array.from(this.body.children);
    const aside = children.find((child) => child.id === DETAILS_ID);

    if (aside === undefined || aside === this.observed) return;

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

/** The layer, its menus and the breadcrumb, built together: a "…" click opens a menu, and a menu reads its anchor off the layer. */
class WidgetParts {
  public readonly widgets: GraphWidgets;
  public readonly menus: GraphWidgetMenus;
  public readonly breadcrumb: GraphBreadcrumb;

  public constructor(deps: WidgetWireDeps) {
    const { page, widgetViews, canAct } = deps;
    const layerDeps: GraphWidgetsDeps = {
      ...deps,
      aside: (): HTMLElement | null => page.body.querySelector<HTMLElement>(DETAILS_SELECTOR),
      isActive: canAct,
      onMenu: (target, opener): void => this.menus.open(target, opener)
    };
    const anchors: MenuAnchors = {
      anchorOf: (target): MenuAnchor | null => this.widgets.anchorOf(target),
      layerBounds: (): LayerBounds => this.widgets.layerBounds()
    };
    const menusDeps: GraphWidgetMenusDeps = { ...deps, anchors, build: widgetViews.menu, isActive: canAct };
    const breadcrumbDeps: GraphBreadcrumbDeps = { ...deps, layer: page.widgets, views: widgetViews };

    this.widgets = new GraphWidgets(layerDeps);
    this.menus = new GraphWidgetMenus(menusDeps);
    this.breadcrumb = new GraphBreadcrumb(breadcrumbDeps);
  }
}

/**
 * Builds the widget layer, its menus and the breadcrumb, and re-reads the layer's bounds when the container resizes, the
 * overlay query flips, or a panel of the body opens or closes; a `hidden` flip deeper in the body (a list row) costs
 * nothing. The details panel mounts with the first graph, which also shows the container, so the resize covers it.
 * Shift+F10 or the ContextMenu key on the canvas or the layer opens the selection's menu, and the browser's own context
 * menu never opens over them.
 */
export const wireWidgets = (deps: WidgetWireDeps): WidgetWiring => {
  const { page, overlay } = deps;
  const { body, container, widgets: layer } = page;
  const { widgets, menus, breadcrumb } = new WidgetParts(deps);
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
      breadcrumb.update();
    },
    position: (): void => {
      widgets.position();
      menus.follow();
    },
    buttonBox: (): AnchorBox | null => widgets.packageButtonBox(),
    groupingOff: (): void => {
      menus.drop();
      breadcrumb.update();
    }
  };

  bounds.observe(container);
  new MutationObserver(onMutations).observe(body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  overlay.addEventListener('change', refreshBounds);
  container.addEventListener('keydown', onMenuKey);
  layer.addEventListener('keydown', onMenuKey);
  document.addEventListener('contextmenu', onContextMenu);

  return wiring;
};
