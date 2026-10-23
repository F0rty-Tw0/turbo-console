import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it } from 'vitest';

import { parkedScreenOf, parkedViewOf } from './parked-view.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { LayoutScreen } from '../common/graph-layouts.type.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import { FALLBACK_NOTICE } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { NORMAL_FOLDER_PAINT } from '../common/paint.const.ts';
import type { Paint } from '../common/paint.type.ts';
import { layoutScreenMock } from '../test/mocks/graph-layouts.mock.ts';
import { graphViewMock } from '../test/mocks/graph-view.mock.ts';

type Mutator = keyof GraphView;

type Call = (view: GraphView) => void;

type ScreenCall = (screen: LayoutScreen) => void;

const PACKAGE_PAN: Position = { x: 4, y: -2 };

const TASK_PAN: Position = { x: 90, y: 30 };

const PACKAGE_CAMERA: Viewport = { zoom: 1.5, pan: PACKAGE_PAN };

const TASK_CAMERA: Viewport = { zoom: 0.5, pan: TASK_PAN };

const NO_NAMES: ReadonlySet<string> = new Set();

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const PLAIN_PAINT: Paint = { nodeState: () => 'normal', edgeState: () => 'normal', ...NORMAL_FOLDER_PAINT };

const MUTATIONS: [Mutator, Call][] = [
  ['setGraph', (view: GraphView): void => view.setGraph([], [], {}, (): NodeSize => NODE_SIZE)],
  ['paint', (view: GraphView): void => view.paint(PLAIN_PAINT)],
  ['fit', (view: GraphView): void => view.fit()],
  ['setVisible', (view: GraphView): void => view.setVisible(NO_NAMES)],
  ['setGhosts', (view: GraphView): void => view.setGhosts({ nodes: [], edges: [] }, NO_NAMES)],
  ['centreOn', (view: GraphView): void => view.centreOn('web')],
  ['panBy', (view: GraphView): void => view.panBy(5)],
  ['setViewport', (view: GraphView): void => view.setViewport(2, TASK_CAMERA.pan)],
  ['setGrouping', (view: GraphView): void => view.setGrouping(null)],
  ['setPositions', (view: GraphView): void => view.setPositions({})],
  ['showFolders', (view: GraphView): void => view.showFolders(null, String)]
];

const SCREEN_CALLS: [keyof LayoutScreen, ScreenCall][] = [
  ['showLoading', (screen: LayoutScreen): void => screen.showLoading()],
  ['showGraph', (screen: LayoutScreen): void => screen.showGraph(false)],
  ['showNotice', (screen: LayoutScreen): void => screen.showNotice(FALLBACK_NOTICE)]
];

describe('FEATURE: parkedScreenOf', () => {
  let inner: Mocked<LayoutScreen>;
  let isParked: boolean;
  let screen: LayoutScreen;

  beforeEach(() => {
    inner = layoutScreenMock();
    isParked = true;
    screen = parkedScreenOf(inner, (): boolean => isParked);
  });

  it.each(SCREEN_CALLS)('GIVEN the screen is parked WHEN %s is called THEN the inner screen never hears of it', (name, call) => {
    call(screen);

    expect(inner[name]).not.toHaveBeenCalled();
  });

  it.each(SCREEN_CALLS)('GIVEN the screen is not parked WHEN %s is called THEN the inner screen does it', (name, call) => {
    isParked = false;
    call(screen);

    expect(inner[name]).toHaveBeenCalledOnce();
  });
});

describe('FEATURE: parkedViewOf', () => {
  let inner: Mocked<GraphView>;
  let isParked: boolean;
  let view: GraphView;

  beforeEach(() => {
    inner = graphViewMock(PACKAGE_CAMERA);
    isParked = false;
    view = parkedViewOf(inner, (): boolean => isParked);
  });

  describe('GIVEN the view is parked', () => {
    beforeEach(() => {
      isParked = true;
    });

    it.each(MUTATIONS)('WHEN %s is called THEN the inner view never hears of it', (name, call) => {
      call(view);

      expect(inner[name]).not.toHaveBeenCalled();
    });

    it('WHEN the task canvas is read THEN it is the inner one', () => {
      expect(view.tasks).toBe(inner.tasks);
    });

    it('WHEN the view is resized THEN the inner view resizes', () => {
      view.resize();

      expect(inner.resize).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN the view is not parked', () => {
    it.each(MUTATIONS)('WHEN %s is called THEN the inner view does it', (name, call) => {
      call(view);

      expect(inner[name]).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN the package camera was read, then the view parked and the task camera set', () => {
    beforeEach(() => {
      view.viewport();
      isParked = true;
      inner.viewport.mockReturnValue(TASK_CAMERA);
    });

    it('WHEN the camera is read THEN it is the last package camera', () => {
      expect(view.viewport()).toStrictEqual(PACKAGE_CAMERA);
    });

    it('WHEN unparked and read again THEN it is the camera on screen', () => {
      isParked = false;

      expect(view.viewport()).toStrictEqual(TASK_CAMERA);
    });
  });
});
