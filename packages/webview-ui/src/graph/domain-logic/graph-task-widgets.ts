import { keepBoxClear } from './graph-keep-clear.ts';
import { GraphWidgetMenus } from './graph-widget-menus.ts';
import { setHidden, translateOf, writeStyle } from './widget-rows.ts';
import { TASK_WIDGET_CLASS } from '../common/graph-task.const.ts';
import type { MenuAnchor } from '../common/graph-widgets.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { TaskDetailsModel, TaskMenuActions, TaskRunAction, TaskWidgetsDeps } from '../common/task-details.type.ts';
import type { MenuItemModel } from '../common/widget-menu.type.ts';
import type { LayerBounds, MenuTarget, RectPx } from '../common/widget.type.ts';
import { joinedBoxOf } from '../utils/keep-clear.util.ts';
import { taskMenuOf } from '../utils/task-menu-model.util.ts';
import { runMessageOf } from '../utils/task-run.util.ts';
import { isWidgetShown, overlayLeftOf, packageButtonRectOf } from '../utils/widget-geometry.util.ts';

type TaskButton = {
  readonly id: string;
  readonly button: HTMLButtonElement;
};

/**
 * The selected task's "…" over the canvas and its menu: Run and Run without cache for a runnable task, Stop while it
 * runs, and no "…" while the menu would be empty. An item posts what the task panel's button posts for the task shown
 * when it runs, so a stale item posts nothing. Shift+F10 opens nothing in task mode. While the task details panel
 * overlays the canvas, the "…" hides under it and the menu opens left of it, following the panel as its sash drags it
 * wider or narrower; when it turns to overlay, the selected task pans clear of it.
 */
export class GraphTaskWidgets {
  private readonly deps: TaskWidgetsDeps;
  private readonly menus: GraphWidgetMenus;
  private readonly actions: TaskMenuActions;
  private model: TaskDetailsModel | null = null;
  private button: TaskButton | null = null;
  private rect: RectPx | null = null;

  public constructor(deps: TaskWidgetsDeps) {
    const anchors = {
      anchorOf: (target: MenuTarget): MenuAnchor | null => this.anchorOf(target),
      layerBounds: (): LayerBounds => this.bounds()
    };

    this.deps = deps;
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
    deps.overlay.addEventListener('change', (): void => this.relayout());
    new ResizeObserver((): void => this.place()).observe(deps.aside());
  }

  /** The "…" beside the selected task of `model`; none for `null`, outside task mode, or while its menu would be empty. */
  public show(model: TaskDetailsModel | null): void {
    const id = model?.task.id ?? null;

    this.model = model;

    const items = this.itemsOf(id);
    const isActive = this.deps.isActive();
    const isShown = items.length > 0 && isActive;

    this.sync(isShown ? id : null);
    this.place();
  }

  /** After a frame: the "…" follows its task, and a camera move closes the menu. */
  public rendered(): void {
    this.place();
    this.menus.follow();
  }

  /** Pans the selected task and its "…" clear of the task details panel while it overlays the canvas. */
  public keepClear(): void {
    const id = this.model?.task.id ?? null;
    const aside = this.deps.aside();
    const isOverlaid = this.deps.overlay.matches && !aside.hidden;

    if (id === null || !isOverlaid) return;

    const { view, page } = this.deps;
    const box = joinedBoxOf(view.anchorBox([id]), this.buttonBox(id));

    keepBoxClear(view, page.container, aside, box);
  }

  /** The overlay media query flipped: in task mode, the "…" is placed against the new bounds and the selected task kept clear. */
  private relayout(): void {
    const isActive = this.deps.isActive();

    if (!isActive) return;

    this.place();
    this.keepClear();
  }

  public exit(): void {
    this.model = null;
    this.menus.drop();
    this.sync(null);
  }

  /** Exactly one "…", built again when the selected task changes; the menu of the one before closes. */
  private sync(id: string | null): void {
    const current = this.button?.id ?? null;

    if (current === id) return;

    this.menus.drop();
    this.button?.button.remove();
    this.button = null;

    if (id === null) return;

    const button = this.deps.views.packageButton(id);
    const target: MenuTarget = { kind: 'package', name: id };
    const open = (): void => {
      const isActive = this.deps.isActive();

      if (isActive) this.menus.open(target, button);
    };

    button.classList.add(TASK_WIDGET_CLASS);
    button.addEventListener('click', open);
    this.deps.page.widgets.append(button);
    this.button = { id, button };
  }

  /** At the task's top right corner, as the package "…" sits; hidden while the task is not drawn inside the canvas. */
  private place(): void {
    const { button } = this;

    if (button === null) return;

    const { selected } = this.deps.view.widgetRects(button.id);

    this.rect = this.shownRectOf(selected);
    setHidden(button.button, this.rect === null);

    if (this.rect !== null) writeStyle(button.button, 'transform', translateOf(this.rect.x1, this.rect.y1));
  }

  /** The "…" rect beside the task's `selected` rect while it meets the canvas, else `null`. */
  private shownRectOf(selected: RectPx | null): RectPx | null {
    if (selected === null) return null;

    const rect = packageButtonRectOf(selected);
    const bounds = this.bounds();
    const isShown = isWidgetShown(rect, bounds);

    return isShown ? rect : null;
  }

  private anchorOf(target: MenuTarget): MenuAnchor | null {
    const { button, rect } = this;
    const id = target.kind === 'package' ? target.name : null;

    if (button === null || rect === null || button.id !== id) return null;

    const anchor: MenuAnchor = { rect, opener: button.button };

    return anchor;
  }

  /** The "…" span of task `id` at the camera now, shown or not; `null` while it has none. */
  private buttonBox(id: string): AnchorBox | null {
    const { selected } = this.deps.view.widgetRects(id);

    if (this.button === null || selected === null) return null;

    return packageButtonRectOf(selected);
  }

  private bounds(): LayerBounds {
    const { overlay, aside, page } = this.deps;
    const { offsetWidth, offsetHeight } = page.container;
    const overlayLeft = overlayLeftOf(aside(), page.container, overlay.matches);
    const bounds: LayerBounds = { width: offsetWidth, height: offsetHeight, overlayLeft };

    return bounds;
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
