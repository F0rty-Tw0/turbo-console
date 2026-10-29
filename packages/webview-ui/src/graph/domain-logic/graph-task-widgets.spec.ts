import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mocked } from 'vitest';

import { GraphTaskWidgets } from './graph-task-widgets.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import type { TaskDetailsModel, TaskWidgetsDeps } from '../common/task-details.type.ts';
import type { TaskToolbarElements } from '../common/task-toolbar.type.ts';
import type { MenuElements } from '../common/widget-menu.type.ts';
import type { RectPx, WidgetRects } from '../common/widget.type.ts';
import type { TickRunner } from '../test/common/tick-observer.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { graphViewMock } from '../test/mocks/graph-view.mock.ts';
import { switchableMediaQueryMock } from '../test/mocks/media-query.mock.ts';
import { taskWidgetViewsMock } from '../test/mocks/task-widget-views.mock.ts';
import { tickObserverMock } from '../test/mocks/tick-observer.mock.ts';
import { API_BUILD_STUB, GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';
import { HOME_CAMERA_STUB } from '../test/stubs/layout.stub.ts';
import { accessLogOf } from '../test/utils/access-log.spec.util.ts';
import { setBox } from '../test/utils/element-box.spec.util.ts';

type WidgetsRig = {
  readonly page: PageElements;
  readonly view: Mocked<GraphView>;
  readonly bridge: Mocked<Bridge>;
  /** The task details panel, its left edge at `PANEL_LEFT`. */
  readonly aside: HTMLElement;
  /** The task toolbars built so far, the latest last. */
  readonly toolbars: TaskToolbarElements[];
  /** The menus built so far, the latest last. */
  readonly menus: MenuElements[];
  readonly widgetsOf: (isOverlay: boolean) => GraphTaskWidgets;
  /** Flips the overlay media query, running its `change` listeners. */
  readonly flipOverlay: (isOverlay: boolean) => void;
  readonly setActive: (isActive: boolean) => void;
  /** Runs the aside's ResizeObserver callbacks, as a drag of its sash does. */
  readonly resizeAside: () => void;
};

const CANVAS_WIDTH = 400;

const CANVAS_HEIGHT = 300;

const PANEL_LEFT = 300;

/** `a#build` drawn left of the panel: its toolbar clear of it. */
const LEFT_RECT: RectPx = { x1: 100, y1: 50, x2: 180, y2: 80 };

/** `a#build` drawn across the panel's left edge: its toolbar under it. */
const UNDER_RECT: RectPx = { x1: 260, y1: 50, x2: 320, y2: 80 };

const RUNNING: TaskDetailsModel = { task: GRAPH_TASK_STUB, state: 'running', dependencies: [], dependents: [], rootLabel: null };

const NOT_RUNNABLE_TASK: GraphTask = { ...GRAPH_TASK_STUB, isRunnable: false };

const NOT_RUNNABLE_IDLE: TaskDetailsModel = { ...RUNNING, task: NOT_RUNNABLE_TASK, state: null };

const API_RUNNING: TaskDetailsModel = { task: API_BUILD_STUB, state: 'running', dependencies: [], dependents: [], rootLabel: null };

const rectsOf = (selected: RectPx): WidgetRects => {
  const rects: WidgetRects = { boxes: new Map(), collapsed: new Map(), selected, zoom: 1 };

  return rects;
};

const rigOf = (): WidgetsRig => {
  const asideResizes: TickRunner[] = [];

  vi.stubGlobal('ResizeObserver', tickObserverMock(asideResizes));
  vi.stubGlobal('MutationObserver', tickObserverMock([]));

  const { page, views, toolbars, menus } = taskWidgetViewsMock();
  const view = graphViewMock(HOME_CAMERA_STUB);
  const bridge: Mocked<Bridge> = { ready: vi.fn(), post: vi.fn(), onMessage: vi.fn(), savedState: vi.fn(), saveState: vi.fn() };
  const aside = document.createElement('aside');
  const overlay = switchableMediaQueryMock(false);
  const activity = { isActive: true };
  const setActive = (isActive: boolean): void => {
    activity.isActive = isActive;
  };
  const widgetsOf = (isOverlay: boolean): GraphTaskWidgets => {
    overlay.flip(isOverlay);

    const deps: TaskWidgetsDeps = {
      page,
      view,
      views,
      bridge,
      isActive: (): boolean => activity.isActive,
      overlay: overlay.query,
      aside: (): HTMLElement => aside
    };

    return new GraphTaskWidgets(deps);
  };

  const resizeAside = (): void => asideResizes.forEach((tick) => tick());

  setBox(page.container, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  setBox(aside, PANEL_LEFT, 100, CANVAS_HEIGHT);
  view.widgetRects.mockReturnValue(rectsOf(LEFT_RECT));

  const rig: WidgetsRig = { page, view, bridge, aside, toolbars, menus, widgetsOf, flipOverlay: overlay.flip, setActive, resizeAside };

  return rig;
};

/** The task toolbars' roots on the layer. */
const taskToolbarsOf = (rig: WidgetsRig): HTMLElement[] =>
  rig.toolbars.map(({ root }) => root).filter((root) => root.isConnected && root.classList.contains('widget-toolbar-task'));

/** Opens the menu of the shown task toolbar's "…" and hands back its Stop item. */
const stopItemOf = (rig: WidgetsRig): HTMLElement | undefined => {
  const [toolbar] = rig.toolbars.filter(({ root }) => root.isConnected);

  toolbar?.ellipsis.click();

  const [menu] = rig.menus;

  return menu?.items[2];
};

describe('FEATURE: GraphTaskWidgets', () => {
  let rig: WidgetsRig;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the details panel docked', () => {
    let widgets: GraphTaskWidgets;

    beforeEach(() => {
      widgets = rig.widgetsOf(false);
      widgets.show(RUNNING);
    });

    it('WHEN a#build is shown running THEN one shown task toolbar sits on the layer', () => {
      const toolbars = taskToolbarsOf(rig);

      expect(toolbars).toHaveLength(1);
      expect(toolbars[0]?.hidden).toBe(false);
    });

    it('WHEN a#build is drawn THEN its toolbar sits above its top-right corner', () => {
      const [toolbar] = taskToolbarsOf(rig);

      expect(toolbar?.style.transform).toBe('translate(156px, 22px)');
    });

    it('WHEN a#build is drawn left of the layer top THEN its toolbar flips below it', () => {
      rig.view.widgetRects.mockReturnValue(rectsOf({ x1: 100, y1: 10, x2: 180, y2: 40 }));
      widgets.rendered();

      expect(taskToolbarsOf(rig)[0]?.style.transform).toBe('translate(156px, 44px)');
    });

    it('WHEN a#build itself is drawn outside the layer THEN no toolbar shows', () => {
      rig.view.widgetRects.mockReturnValue(rectsOf({ x1: 100, y1: 310, x2: 180, y2: 340 }));
      widgets.rendered();

      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(true);
    });

    it('WHEN a#build is shown again THEN its toolbar is kept', () => {
      const [before] = taskToolbarsOf(rig);

      widgets.show({ ...RUNNING, state: 'passed' });

      expect(taskToolbarsOf(rig)).toStrictEqual([before]);
    });

    it('WHEN api#build is shown instead THEN the a#build toolbar goes and one other takes its place', () => {
      const [before] = taskToolbarsOf(rig);

      widgets.show(API_RUNNING);

      const after = taskToolbarsOf(rig);

      expect(after).toHaveLength(1);
      expect(after[0]).not.toBe(before);
    });

    it('WHEN the selection clears THEN no task toolbar is left', () => {
      widgets.show(null);

      expect(taskToolbarsOf(rig)).toHaveLength(0);
    });

    it('WHEN a#build is drawn across the panel edge THEN its toolbar still shows', () => {
      rig.view.widgetRects.mockReturnValue(rectsOf(UNDER_RECT));
      widgets.rendered();

      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(false);
    });

    it('WHEN the a#build "…" opens its menu and Stop is clicked THEN stopTask is posted', () => {
      stopItemOf(rig)?.click();

      expect(rig.bridge.post).toHaveBeenCalledExactlyOnceWith({ type: 'stopTask', taskId: 'a#build' });
    });

    it('WHEN the menu opened, then api#build is shown, and the old Stop is clicked THEN nothing is posted', () => {
      const stop = stopItemOf(rig);

      widgets.show(API_RUNNING);
      stop?.click();

      expect(rig.bridge.post).not.toHaveBeenCalled();
    });

    it('WHEN a#build is shown running and two frames pass THEN no layout is read', () => {
      const log = accessLogOf([rig.page.container, rig.aside]);

      widgets.rendered();
      widgets.rendered();

      const reads = log.filter((entry) => entry.startsWith('read'));

      expect(reads).toStrictEqual([]);
    });

    it('WHEN the selection keeps clear THEN the camera stays', () => {
      rig.view.widgetRects.mockReturnValue(rectsOf(UNDER_RECT));
      widgets.keepClear();

      expect(rig.view.panBy).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the details panel docked and a#build shown running across its left edge', () => {
    let widgets: GraphTaskWidgets;

    beforeEach(() => {
      widgets = rig.widgetsOf(false);
      rig.view.widgetRects.mockReturnValue(rectsOf(UNDER_RECT));
      rig.view.anchorBox.mockReturnValue({ x1: UNDER_RECT.x1, x2: UNDER_RECT.x2 });
      widgets.show(RUNNING);
    });

    it('WHEN the panel turns to overlay THEN the camera pans a#build and its toolbar left of the panel, by a margin', () => {
      rig.flipOverlay(true);

      expect(rig.view.panBy).toHaveBeenCalledExactlyOnceWith(PANEL_LEFT - 16 - UNDER_RECT.x2);
    });

    it('WHEN the panel turns to overlay THEN the toolbar hides under it until the camera moves', () => {
      rig.flipOverlay(true);

      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(true);
    });

    it('WHEN task mode is left, entered again and the panel turns to overlay THEN the camera pans once', () => {
      widgets.exit();
      widgets.show(RUNNING);
      rig.flipOverlay(true);

      expect(rig.view.panBy).toHaveBeenCalledOnce();
    });

    it('WHEN task mode is off and the panel turns to overlay THEN the camera stays and the toolbar is left as it was', () => {
      rig.setActive(false);
      rig.flipOverlay(true);

      expect(rig.view.panBy).not.toHaveBeenCalled();
      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(false);
    });

    it('WHEN task mode is off, the panel turns to overlay and task mode is on again THEN the toolbar hides on the next frame', () => {
      rig.setActive(false);
      rig.flipOverlay(true);
      rig.setActive(true);
      widgets.rendered();

      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(true);
    });
  });

  describe('GIVEN the details panel overlays the canvas', () => {
    let widgets: GraphTaskWidgets;

    beforeEach(() => {
      widgets = rig.widgetsOf(true);
      widgets.show(RUNNING);
    });

    it('WHEN a#build is drawn left of the panel THEN its toolbar shows', () => {
      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(false);
    });

    it('WHEN a#build is drawn across the panel edge THEN its toolbar hides', () => {
      rig.view.widgetRects.mockReturnValue(rectsOf(UNDER_RECT));
      widgets.rendered();

      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(true);
    });

    it('WHEN a#build is drawn across the panel edge and the panel then narrows THEN its toolbar shows', () => {
      rig.view.widgetRects.mockReturnValue(rectsOf(UNDER_RECT));
      widgets.rendered();
      setBox(rig.aside, CANVAS_WIDTH - 20, 100, CANVAS_HEIGHT);
      rig.resizeAside();

      expect(taskToolbarsOf(rig)[0]?.hidden).toBe(false);
    });

    describe('WHEN a#build is drawn across the panel edge and the selection keeps clear', () => {
      beforeEach(() => {
        rig.view.widgetRects.mockReturnValue(rectsOf(UNDER_RECT));
        rig.view.anchorBox.mockReturnValue({ x1: UNDER_RECT.x1, x2: UNDER_RECT.x2 });
        widgets.keepClear();
      });

      it('THEN the camera pans a#build and its toolbar left of the panel, by a margin', () => {
        expect(rig.view.panBy).toHaveBeenCalledExactlyOnceWith(PANEL_LEFT - 16 - UNDER_RECT.x2);
      });

      it('THEN the anchor read is a#build', () => {
        expect(rig.view.anchorBox).toHaveBeenCalledExactlyOnceWith(['a#build']);
      });
    });

    it('WHEN a#build fits beside the panel but its toolbar does not and the selection keeps clear THEN the camera stays', () => {
      const narrow: RectPx = { x1: 40, y1: 50, x2: 60, y2: 80 };

      setBox(rig.aside, 54, 100, CANVAS_HEIGHT);
      rig.view.widgetRects.mockReturnValue(rectsOf(narrow));
      rig.view.anchorBox.mockReturnValue({ x1: narrow.x1, x2: narrow.x2 });
      widgets.keepClear();

      expect(rig.view.panBy).not.toHaveBeenCalled();
    });

    it('WHEN a#build has no toolbar, as its menu is empty, and the selection keeps clear THEN the camera pans a#build alone', () => {
      const narrow: RectPx = { x1: 40, y1: 50, x2: 60, y2: 80 };

      widgets.show(NOT_RUNNABLE_IDLE);
      setBox(rig.aside, 54, 100, CANVAS_HEIGHT);
      rig.view.widgetRects.mockReturnValue(rectsOf(narrow));
      rig.view.anchorBox.mockReturnValue({ x1: narrow.x1, x2: narrow.x2 });
      widgets.keepClear();

      expect(rig.view.panBy).toHaveBeenCalledExactlyOnceWith(54 - 16 - narrow.x2);
    });

    it('WHEN the panel is closed and the selection keeps clear THEN the camera stays', () => {
      rig.aside.hidden = true;
      rig.view.anchorBox.mockReturnValue({ x1: UNDER_RECT.x1, x2: UNDER_RECT.x2 });
      widgets.keepClear();

      expect(rig.view.panBy).not.toHaveBeenCalled();
    });

    it('WHEN nothing is selected and the selection keeps clear THEN the camera stays', () => {
      widgets.show(null);
      rig.view.anchorBox.mockReturnValue({ x1: UNDER_RECT.x1, x2: UNDER_RECT.x2 });
      widgets.keepClear();

      expect(rig.view.panBy).not.toHaveBeenCalled();
    });
  });
});
