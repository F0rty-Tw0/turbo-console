import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { setBox } from './element-box.spec.util.ts';
import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { TaskWidgetsDeps } from '../../common/task-details.type.ts';
import type { RectPx, WidgetRects } from '../../common/widget.type.ts';
import { CANVAS_HEIGHT, CANVAS_WIDTH, PANEL_LEFT } from '../common/graph-task-widgets.const.ts';
import type { TaskWidgetsRig } from '../common/graph-task-widgets.type.ts';
import type { TickRunner } from '../common/tick-observer.type.ts';
import { graphViewMock } from '../mocks/graph-view.mock.ts';
import { switchableMediaQueryMock } from '../mocks/media-query.mock.ts';
import { taskWidgetViewsMock } from '../mocks/task-widget-views.mock.ts';
import { tickObserverMock } from '../mocks/tick-observer.mock.ts';
import { HOME_CAMERA_STUB } from '../stubs/layout.stub.ts';

/** `a#build` drawn left of the panel: its toolbar clear of it. */
const LEFT_RECT: RectPx = { x1: 100, y1: 50, x2: 180, y2: 80 };

/** The widget rects of a view with `selected` drawn at zoom 1. */
export const rectsOf = (selected: RectPx): WidgetRects => {
  const rects: WidgetRects = { boxes: new Map(), collapsed: new Map(), selected, zoom: 1 };

  return rects;
};

/** A canvas `CANVAS_WIDTH` by `CANVAS_HEIGHT` with the task details panel at `PANEL_LEFT`, `a#build` drawn at `LEFT_RECT`, in task mode. */
export const taskWidgetsRigOf = (): TaskWidgetsRig => {
  const asideResizes: TickRunner[] = [];

  vi.stubGlobal('ResizeObserver', tickObserverMock(asideResizes));
  vi.stubGlobal('MutationObserver', tickObserverMock([]));

  const { page, views, toolbars, menus } = taskWidgetViewsMock();
  const view = graphViewMock(HOME_CAMERA_STUB);
  const bridge: Mocked<Bridge> = { ready: vi.fn(), post: vi.fn(), onMessage: vi.fn(), savedState: vi.fn(), saveState: vi.fn() };
  const aside = document.createElement('aside');
  const onShowPackage = vi.fn<(name: string) => void>();
  const overlay = switchableMediaQueryMock(false);
  const activity = { isActive: true };
  const setActive = (isActive: boolean): void => {
    activity.isActive = isActive;
  };
  const depsOf = (isOverlay: boolean): TaskWidgetsDeps => {
    overlay.flip(isOverlay);

    const deps: TaskWidgetsDeps = {
      page,
      view,
      views,
      bridge,
      isActive: (): boolean => activity.isActive,
      onShowPackage,
      overlay: overlay.query,
      aside: (): HTMLElement => aside
    };

    return deps;
  };

  const resizeAside = (): void => asideResizes.forEach((tick) => tick());

  setBox(page.container, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  setBox(aside, PANEL_LEFT, 100, CANVAS_HEIGHT);
  view.widgetRects.mockReturnValue(rectsOf(LEFT_RECT));

  const flipOverlay = overlay.flip;
  const rig: TaskWidgetsRig = {
    page,
    view,
    bridge,
    onShowPackage,
    aside,
    toolbars,
    menus,
    depsOf,
    flipOverlay,
    setActive,
    resizeAside
  };

  return rig;
};

/** The task toolbars' roots on the layer. */
export const taskToolbarsOf = (rig: TaskWidgetsRig): HTMLElement[] =>
  rig.toolbars.map(({ root }): HTMLElement => root).filter((root): boolean => root.isConnected);

/** Opens the menu of the shown task toolbar's "…" and hands back its Stop item. */
export const stopItemOf = (rig: TaskWidgetsRig): HTMLElement | undefined => {
  const [toolbar] = rig.toolbars.filter(({ root }): boolean => root.isConnected);

  toolbar?.ellipsis.click();

  const [menu] = rig.menus;

  return menu?.items[2];
};
