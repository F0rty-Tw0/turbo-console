import { keepBoxClear } from './graph-keep-clear.ts';
import { taskToolbarBoxOf } from './graph-task-toolbar-box.ts';
import { GraphWidgetMenus } from './graph-widget-menus.ts';
import { readLayerBounds, watchLayerBounds } from './layer-bounds-watch.ts';
import { TaskToolbar } from './task-toolbar.ts';
import type { MenuAnchor } from '../common/graph-widgets.type.ts';
import type { TaskDetailsModel, TaskMenuActions, TaskRunAction, TaskWidgetsDeps } from '../common/task-details.type.ts';
import type { MenuItemModel } from '../common/widget-menu.type.ts';
import type { LayerBounds, MenuTarget, RectPx } from '../common/widget.type.ts';
import { joinedBoxOf } from '../utils/keep-clear.util.ts';
import { taskAnchorOf } from '../utils/task-anchor.util.ts';
import { taskMenuOf } from '../utils/task-menu-model.util.ts';
import { runMessageOf } from '../utils/task-run.util.ts';
import { shownNodeToolbarOf } from '../utils/widget-geometry.util.ts';

/**
 * The selected task's node toolbar over the canvas and its menu: Run and Run without cache for a runnable task, Stop
 * while it runs, and no toolbar while the menu would be empty. An item posts what the task panel's button posts for the
 * task shown when it runs, so a stale item posts nothing. Shift+F10 opens nothing in task mode. While the task details
 * panel overlays the canvas, the toolbar hides under it and the menu opens left of it, following the panel as its sash
 * drags it wider or narrower; when it turns to overlay, the selected task pans clear of it. It reads the layer bounds
 * only when the layer-bounds watch fires, so a frame reads no layout.
 */
export class GraphTaskWidgets {
  private readonly deps: TaskWidgetsDeps;
  private readonly menus: GraphWidgetMenus;
  private readonly actions: TaskMenuActions;
  private readonly toolbar: TaskToolbar;
  private model: TaskDetailsModel | null = null;
  private bounds: LayerBounds;
  private rect: RectPx | null = null;

  public constructor(deps: TaskWidgetsDeps) {
    const anchors = {
      anchorOf: (target: MenuTarget): MenuAnchor | null => taskAnchorOf(this.toolbar.id(), this.toolbar.ellipsis(), this.rect, target),
      layerBounds: (): LayerBounds => this.bounds
    };

    this.deps = deps;
    this.bounds = readLayerBounds(deps.page.container, deps.aside(), deps.overlay.matches);
    this.toolbar = new TaskToolbar({
      layer: deps.page.widgets,
      container: deps.page.container,
      views: deps.views,
      onMenu: (opener: HTMLButtonElement): void => this.open(opener)
    });
    this.actions = { act: (id: string, action: TaskRunAction): void => this.act(id, action) };
    this.menus = new GraphWidgetMenus({
      page: deps.page,
      view: deps.view,
      anchors,
      build: deps.views.menu,
      isActive: deps.isActive,
      menuOf: (target: MenuTarget): MenuItemModel[] => this.menuOf(target),
      selection: (): MenuTarget | null => null
    });
    watchLayerBounds(deps.page, deps.overlay, deps.aside, (): void => this.refreshBounds());
    deps.overlay.addEventListener('change', (): void => this.relayout());
  }

  /** The toolbar beside the selected task of `model`; none for `null`, outside task mode, or while its menu would be empty. */
  public show(model: TaskDetailsModel | null): void {
    const id = model?.task.id ?? null;

    this.model = model;

    const items = this.itemsOf(id);
    const isActive = this.deps.isActive();
    const isShown = items.length > 0 && isActive;

    this.sync(isShown ? id : null);
    this.place();
  }

  /** After a frame: the toolbar follows its task, and a camera move closes the menu. */
  public rendered(): void {
    this.place();
    this.menus.follow();
  }

  /** Pans the selected task and its toolbar clear of the task details panel while it overlays the canvas. */
  public keepClear(): void {
    const id = this.model?.task.id ?? null;
    const aside = this.deps.aside();
    const isOverlaid = this.deps.overlay.matches && !aside.hidden;

    if (id === null || !isOverlaid) return;

    const { view, page } = this.deps;
    const toolbarBox = taskToolbarBoxOf(view, this.toolbar.id());
    const box = joinedBoxOf(view.anchorBox([id]), toolbarBox);

    keepBoxClear(view, page.container, aside, box);
  }

  /** The watch fired: the bounds are read again, and in task mode the toolbar is placed against them. */
  private refreshBounds(): void {
    const { page, aside, overlay } = this.deps;
    const isActive = this.deps.isActive();

    this.bounds = readLayerBounds(page.container, aside(), overlay.matches);

    if (isActive) this.place();
  }

  /** The overlay media query flipped: in task mode, the selected task is kept clear of the panel. */
  private relayout(): void {
    const isActive = this.deps.isActive();

    if (isActive) this.keepClear();
  }

  public exit(): void {
    this.model = null;
    this.menus.drop();
    this.sync(null);
  }

  /** Exactly one toolbar, built again when the selected task changes; the menu of the one before closes. */
  private sync(id: string | null): void {
    const current = this.toolbar.id();

    if (current === id) return;

    this.menus.drop();
    this.toolbar.sync(id);
  }

  /** Opens the menu of the selected task on its "…" while task mode is on. */
  private open(opener: HTMLButtonElement): void {
    const id = this.toolbar.id();
    const isActive = this.deps.isActive();

    if (id === null || !isActive) return;

    this.menus.open({ kind: 'package', name: id }, opener);
  }

  /** Above the task's top right corner, or below it where it would leave the layer; hidden while the task or the toolbar is not drawn inside the canvas. */
  private place(): void {
    const id = this.toolbar.id();

    if (id === null) return;

    const { selected } = this.deps.view.widgetRects(id);

    this.rect = null;

    if (selected !== null) this.rect = shownNodeToolbarOf(selected, 1, [], this.bounds);

    this.toolbar.place(this.rect);
  }

  private menuOf(target: MenuTarget): MenuItemModel[] {
    const id = target.kind === 'package' ? target.name : null;

    return this.itemsOf(id);
  }

  private itemsOf(id: string | null): MenuItemModel[] {
    const model = this.modelOf(id);

    if (model === null) return [];

    return taskMenuOf(model.task, model.state, this.actions);
  }

  /** The shown task's model when its id is `id`, else `null`, so an item of a task since replaced posts nothing. */
  private modelOf(id: string | null): TaskDetailsModel | null {
    const { model } = this;

    return model?.task.id === id ? model : null;
  }

  private act(id: string, action: TaskRunAction): void {
    const model = this.modelOf(id);
    const message = runMessageOf(model, action);

    if (message !== null) this.deps.bridge.post(message);
  }
}
