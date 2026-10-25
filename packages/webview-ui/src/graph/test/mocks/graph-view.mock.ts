import type { Mocked } from 'vitest';
import { vi } from 'vitest';

import type { Positions } from '../../../bridge/common/graph-state.type.ts';
import type { GraphView, Viewport } from '../../common/graph-page.type.ts';
import type { AtomCanvas, TaskCanvas } from '../../common/task-canvas.type.ts';

export const taskCanvasMock = (): Mocked<TaskCanvas> => {
  const none = (): Positions => {
    const positions: Positions = {};

    return positions;
  };
  const canvas: Mocked<TaskCanvas> = {
    show: vi.fn<TaskCanvas['show']>(),
    clear: vi.fn<TaskCanvas['clear']>(),
    setPositions: vi.fn<TaskCanvas['setPositions']>(),
    positions: vi.fn<TaskCanvas['positions']>(none),
    paint: vi.fn<TaskCanvas['paint']>(),
    runStates: vi.fn<TaskCanvas['runStates']>(),
    setCounts: vi.fn<TaskCanvas['setCounts']>(),
    remark: vi.fn<TaskCanvas['remark']>()
  };

  return canvas;
};

export const atomCanvasMock = (): Mocked<AtomCanvas> => {
  const canvas: Mocked<AtomCanvas> = {
    expand: vi.fn<AtomCanvas['expand']>(() => true),
    collapse: vi.fn<AtomCanvas['collapse']>(),
    setPositions: vi.fn<AtomCanvas['setPositions']>(),
    setOutcomes: vi.fn<AtomCanvas['setOutcomes']>(),
    setGrabbable: vi.fn<AtomCanvas['setGrabbable']>(),
    isAtomNode: vi.fn<AtomCanvas['isAtomNode']>(() => true)
  };

  return canvas;
};

/** Every view method a spy; `viewport()` answers `camera`. */
export const graphViewMock = (camera: Viewport): Mocked<GraphView> => {
  const view: Mocked<GraphView> = {
    setGraph: vi.fn<GraphView['setGraph']>(),
    paint: vi.fn<GraphView['paint']>(),
    fit: vi.fn<GraphView['fit']>(),
    setVisible: vi.fn<GraphView['setVisible']>(),
    setGhosts: vi.fn<GraphView['setGhosts']>(),
    resize: vi.fn<GraphView['resize']>(),
    centreOn: vi.fn<GraphView['centreOn']>(),
    anchorBox: vi.fn<GraphView['anchorBox']>(() => null),
    panBy: vi.fn<GraphView['panBy']>(),
    viewport: vi.fn<GraphView['viewport']>(() => camera),
    setViewport: vi.fn<GraphView['setViewport']>(),
    setGrouping: vi.fn<GraphView['setGrouping']>(),
    setPositions: vi.fn<GraphView['setPositions']>(),
    showFolders: vi.fn<GraphView['showFolders']>(),
    applyTheme: vi.fn<GraphView['applyTheme']>(),
    widgetRects: vi.fn<GraphView['widgetRects']>(),
    exportPng: vi.fn<GraphView['exportPng']>(() => ''),
    flowEdges: vi.fn<GraphView['flowEdges']>(() => []),
    cy: vi.fn<GraphView['cy']>(),
    tasks: taskCanvasMock(),
    atoms: atomCanvasMock()
  };

  return view;
};
