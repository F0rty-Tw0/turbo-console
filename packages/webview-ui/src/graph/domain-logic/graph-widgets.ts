import { readLayerBounds } from './layer-bounds-watch.ts';
import { PackageToolbar } from './package-toolbar.ts';
import { WidgetRows } from './widget-rows.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GraphWidgetsDeps, MenuAnchor } from '../common/graph-widgets.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { LayerBounds, MenuTarget, WidgetPlan, WidgetPlanInput } from '../common/widget.type.ts';
import { tapPairOf } from '../utils/tap-pair.util.ts';
import { buttonRectsOf, ellipsisSlotOf, nodeToolbarCountAt, nodeToolbarRectOf } from '../utils/widget-geometry.util.ts';
import { widgetPlanOf } from '../utils/widget-plan.util.ts';

/** The folder the selected package is drawn in; `null` when no folder scene is drawn (flat) or nothing is selected. */
const folderOfSelected = (scene: FolderScene | null, selected: string | null): string | null => {
  if (scene === null || selected === null) return null;

  return scene.folderOf.get(selected) ?? null;
};

const NO_PLAN: WidgetPlan = { rows: [], nodeToolbar: null };

/**
 * The folder header rows, with their Focus folder toggle, and the selected package's node toolbar, flat or grouped, over
 * the canvas: `refresh` rebuilds them from the scene and the selection, `position` places them from the rendered rects
 * without reading DOM layout, `refreshBounds` re-reads the container and the overlay edge. Every click acts only while
 * the checkbox's mode is the mode on screen.
 */
export class GraphWidgets {
  private readonly deps: GraphWidgetsDeps;
  private readonly rows: WidgetRows;
  private readonly toolbar: PackageToolbar;
  private readonly noteTitleTap = tapPairOf();
  private bounds: LayerBounds = { width: 0, height: 0, overlayLeft: null };
  private plan: WidgetPlan = NO_PLAN;

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
    this.toolbar = new PackageToolbar({
      layer: deps.page.widgets,
      container: deps.page.container,
      views: deps.widgetViews,
      onMenu: (target, opener): void => this.actOnPackage((): void => deps.onMenu(target, opener)),
      onFocus: (name): void => this.actOnPackage((): void => deps.packageActions.focus(name)),
      onStartTrace: (): void => this.actOnPackage((): void => deps.packageActions.startTrace()),
      onShowTasks: (name): void => this.actOnPackage((): void => deps.packageActions.showTasks(name)),
      onCollapse: (folder): void => this.act((): void => deps.actions.toggle(folder))
    });
  }

  public refresh(): void {
    const { scene, selectedPackage, focusedFolder, packageState } = this.deps.state();
    const folder = folderOfSelected(scene, selectedPackage);

    this.toolbar.sync(selectedPackage, folder, packageState);
    this.rows.sync(scene, focusedFolder);
    this.position();
    this.rows.restoreFocus();
  }

  /** One pass: the rendered rects, the plan, then the style writes that changed and the collapsed labels of rows not shown. */
  public position(): void {
    const rowCount = this.rows.size();
    const selected = this.toolbar.name();
    const isEmpty = rowCount === 0 && selected === null;

    if (isEmpty) return;

    const rects = this.deps.view.widgetRects(selected);
    const input: WidgetPlanInput = {
      rects,
      bounds: this.bounds,
      toolbarCount: this.toolbar.count()
    };

    this.plan = widgetPlanOf(input);
    this.rows.place(this.plan.rows);
    this.deps.view.markRowLess(this.plan.rows);
    this.toolbar.place(this.plan.nodeToolbar, rects.zoom);
  }

  public refreshBounds(): void {
    const { page, overlay, aside } = this.deps;
    const { container, widgets } = page;
    const { offsetLeft, offsetTop } = container;

    this.bounds = readLayerBounds(container, aside(), overlay.matches);
    widgets.style.left = `${offsetLeft}px`;
    widgets.style.top = `${offsetTop}px`;
    widgets.style.width = `${this.bounds.width}px`;
    widgets.style.height = `${this.bounds.height}px`;
    this.position();
  }

  /**
   * The package toolbar's x span at the camera of this call, shown or not, so a keep-clear pan brings it out from under
   * the overlay: the "…" alone under `NODE_TOOLBAR_MIN_PX`, else every button it can show; the flip moves only y, so
   * keep-clear needs no rows.
   */
  public packageToolbarBox(): AnchorBox | null {
    const name = this.toolbar.name();

    if (name === null) return null;

    const { selected, zoom } = this.deps.view.widgetRects(name);

    if (selected === null) return null;

    const count = nodeToolbarCountAt(zoom, this.toolbar.count());
    const rect = nodeToolbarRectOf(selected, count, []);
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
    const rect = this.plan.nodeToolbar;
    const selected = this.toolbar.name();

    if (rect === null || selected !== name) return null;

    const opener = this.toolbar.ellipsis();
    const slot = ellipsisSlotOf(rect);
    const anchor: MenuAnchor = { rect: slot, opener };

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

  private actOnPackage(action: () => void): void {
    const isActive = this.deps.isPackageActive();

    if (isActive) action();
  }
}
