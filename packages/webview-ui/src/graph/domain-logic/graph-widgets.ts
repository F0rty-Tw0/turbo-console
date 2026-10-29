import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import { WidgetRows } from './widget-rows.ts';
import type { GraphWidgetsDeps, MenuAnchor } from '../common/graph-widgets.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { LayerBounds, MenuTarget, RectPx, WidgetPlan, WidgetPlanInput } from '../common/widget.type.ts';
import { tapPairOf } from '../utils/tap-pair.util.ts';
import { buttonRectsOf, nodeToolbarRectOf, overlayLeftOf } from '../utils/widget-geometry.util.ts';
import { widgetPlanOf } from '../utils/widget-plan.util.ts';

type PackageEntry = {
  readonly name: string;
  readonly button: HTMLButtonElement;
};

/** The package toolbar is the "…" alone so far. */
const PACKAGE_TOOLBAR_COUNT = 1;

const NO_PLAN: WidgetPlan = { rows: [], nodeToolbar: null };

/**
 * The folder header rows, with their Focus folder toggle, and the selected package's "…" over the canvas:
 * `refresh` rebuilds them from the scene and the selection, `position` places them from the rendered rects without
 * reading DOM layout, `refreshBounds` re-reads the container and the overlay edge. Every click acts only while the
 * checkbox's mode is the mode on screen.
 */
export class GraphWidgets {
  private readonly deps: GraphWidgetsDeps;
  private readonly rows: WidgetRows;
  private readonly noteTitleTap = tapPairOf();
  private button: PackageEntry | null = null;
  private bounds: LayerBounds = { width: 0, height: 0, overlayLeft: null };
  private plan: WidgetPlan = NO_PLAN;
  private isGrouped = false;

  public constructor(deps: GraphWidgetsDeps) {
    this.deps = deps;
    this.rows = new WidgetRows({
      layer: deps.page.widgets,
      views: deps.widgetViews,
      onToggle: (folder): void => this.act((): void => deps.actions.toggle(folder)),
      onTitle: (folder, event): void => this.onTitle(folder, event),
      onFocus: (folder): void => this.act((): void => deps.actions.focusFolder(folder)),
      onMenu: (target, opener): void => this.act((): void => deps.onMenu(target, opener))
    });
  }

  public refresh(): void {
    const { isGrouped, scene, selectedPackage, focusedFolder } = this.deps.state();
    const name = isGrouped ? selectedPackage : null;

    this.isGrouped = isGrouped;
    this.syncButton(name);
    this.rows.sync(scene, this.button?.button ?? null, focusedFolder);
    this.position();
    this.rows.restoreFocus();
  }

  /** One pass: the rendered rects, the plan, then the style writes that changed and the collapsed labels of rows not shown. */
  public position(): void {
    const rowCount = this.rows.size();
    const isEmpty = rowCount === 0 && this.button === null;

    if (isEmpty) return;

    const selected = this.button?.name ?? null;
    const rects = this.deps.view.widgetRects(selected);
    const input: WidgetPlanInput = {
      rects,
      bounds: this.bounds,
      isGrouped: this.isGrouped,
      toolbarCount: PACKAGE_TOOLBAR_COUNT
    };

    this.plan = widgetPlanOf(input);
    this.rows.place(this.plan.rows);
    this.deps.view.markRowLess(this.plan.rows);
    this.placeButton(this.plan.nodeToolbar);
  }

  public refreshBounds(): void {
    const { page, overlay, aside } = this.deps;
    const { container, widgets } = page;
    const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = container;
    const overlayLeft = overlayLeftOf(aside(), container, overlay.matches);

    widgets.style.left = `${offsetLeft}px`;
    widgets.style.top = `${offsetTop}px`;
    widgets.style.width = `${offsetWidth}px`;
    widgets.style.height = `${offsetHeight}px`;
    this.bounds = { width: offsetWidth, height: offsetHeight, overlayLeft };
    this.position();
  }

  /**
   * The package "…" span at the camera of this call, shown or not, so a keep-clear pan brings it out from under the
   * overlay; the flip moves only y, so keep-clear needs no rows. It also skips the compact rule (the "…" alone under
   * `NODE_TOOLBAR_MIN_PX`), which is right only while the count is 1; U4d must apply it.
   */
  public packageButtonBox(): AnchorBox | null {
    if (this.button === null || !this.isGrouped) return null;

    const { selected } = this.deps.view.widgetRects(this.button.name);

    if (selected === null) return null;

    const rect = nodeToolbarRectOf(selected, PACKAGE_TOOLBAR_COUNT, []);
    const box: AnchorBox = { x1: rect.x1, x2: rect.x2 };

    return box;
  }

  /** Where a menu for `target` opens, from the latest pass; `null` while its row or "…" is not placed. */
  public anchorOf(target: MenuTarget): MenuAnchor | null {
    if (target.kind === 'package') return this.packageAnchor(target.name);

    const row = this.plan.rows.find((plan) => plan.folder === target.folder);

    if (row === undefined) return null;

    const ellipsis = this.rows.ellipsisOf(target.folder);
    const opener = row.isEllipsisShown ? ellipsis : null;
    const { ellipsis: rect } = buttonRectsOf(row.placement);
    const anchor: MenuAnchor = { rect, opener };

    return anchor;
  }

  /** The layer's size and the overlay edge, as the last `refreshBounds` read them. */
  public layerBounds(): LayerBounds {
    return this.bounds;
  }

  private packageAnchor(name: string): MenuAnchor | null {
    const { button } = this;
    const rect = this.plan.nodeToolbar;

    if (rect === null || button?.name !== name) return null;

    const anchor: MenuAnchor = { rect, opener: button.button };

    return anchor;
  }

  /**
   * A click on a folder title selects the folder, while the checkbox's mode is the mode on screen. A pointer click
   * (`detail` > 0) then focuses the graph, as a tap on the canvas does, even while the mode is switching, since the
   * browser has already focused the title and nothing else would move it. Only the second pointer click on the same
   * title within `DOUBLE_TAP_MS` toggles it, and only while the mode is on screen. Enter and Space (`detail` 0) only
   * select: focus stays on the title and a held key never pairs (plan index.md, "Changed vs spec").
   */
  private onTitle(folder: string, event: MouseEvent): void {
    this.act((): void => this.deps.actions.select(folder));

    if (event.detail === 0) return;

    this.deps.page.container.focus();
    this.act((): void => this.toggleOnSecondTap(folder, event));
  }

  private toggleOnSecondTap(folder: string, event: MouseEvent): void {
    const isDouble = this.noteTitleTap(folder, event.timeStamp);

    if (isDouble) this.deps.actions.toggle(folder);
  }

  private act(action: () => void): void {
    const isActive = this.deps.isActive();

    if (isActive) action();
  }

  /** Exactly one package "…", built again when the selection changes; none without a grouped selection. */
  private syncButton(name: string | null): void {
    const current = this.button?.name ?? null;

    if (current === name) return;

    this.button?.button.remove();
    this.button = null;

    if (name === null) return;

    const button = this.deps.widgetViews.packageButton(name);
    const target: MenuTarget = { kind: 'package', name };

    button.addEventListener('click', (): void => this.act((): void => this.deps.onMenu(target, button)));
    this.deps.page.widgets.append(button);
    this.button = { name, button };
  }

  private placeButton(rect: RectPx | null): void {
    if (this.button === null) return;

    const { button } = this.button;

    setHidden(button, rect === null);

    if (rect !== null) writeStyle(button, 'transform', translateOf(rect.x1, rect.y1));
  }
}
