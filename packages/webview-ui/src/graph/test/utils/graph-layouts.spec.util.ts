import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { vi } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { WebviewMessage } from '../../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';
import type { GraphReady, Positions } from '../../../bridge/common/graph-state.type.ts';
import type { GraphLayoutsDeps } from '../../common/graph-layouts.type.ts';
import type { DrawnGraph } from '../../common/graph-page.type.ts';
import { FOLDER_ID_PREFIX } from '../../common/graph.const.ts';
import type { LayoutResult } from '../../common/layout.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import { drawnGraphOf } from '../../utils/drawn-graph.util.ts';
import type { LayoutsRig } from '../common/graph-layouts.type.ts';
import { layoutScreenMock, layoutViewMock } from '../mocks/graph-layouts.mock.ts';
import { layoutRunsMock } from '../mocks/layout-runner.mock.ts';

const NODE_SIZE: NodeSize = { width: 100, height: 32 };

/** Every double a `GraphLayouts` needs; `deps.drawn()` answers `null` until `setDrawn`. */
export const layoutsRigOf = (): LayoutsRig => {
  const posted: (WebviewMessage | GraphWebviewMessage)[] = [];
  let drawn: DrawnGraph | null = null;
  const post = (message: WebviewMessage | GraphWebviewMessage): void => {
    posted.push(message);
  };
  const bridge: Bridge = { ready: vi.fn(), post, onMessage: vi.fn(), savedState: vi.fn(), saveState: vi.fn() };
  const screen = layoutScreenMock();
  const view = layoutViewMock();
  const runs = layoutRunsMock();
  const onDrawn = vi.fn<GraphLayoutsDeps['onDrawn']>();
  const onPlaced = vi.fn<GraphLayoutsDeps['onPlaced']>();
  const sizeOf = (): NodeSize => NODE_SIZE;
  const deps: GraphLayoutsDeps = {
    bridge,
    screen,
    view,
    runner: runs.runner,
    sizeOf,
    drawn: (): DrawnGraph | null => drawn,
    onDrawn,
    onPlaced
  };
  const posts = (): (WebviewMessage | GraphWebviewMessage)[] => [...posted];
  const setDrawn = (state: GraphReady | null): void => {
    if (state === null) {
      drawn = null;

      return;
    }

    drawn = drawnGraphOf(state);
  };
  const rig: LayoutsRig = { deps, screen, view, runs, onDrawn, onPlaced, posts, setDrawn };

  return rig;
};

export const resultOf = (hash: string, positions: Positions, engine: LayoutResult['engine'] = 'elk'): LayoutResult => {
  const result: LayoutResult = { hash, positions, engine, ms: 5 };

  return result;
};

/** A grouped ELK graph's root children are folder compounds. */
export const isGroupedGraph = (graph: ElkNode): boolean => {
  const first = graph.children?.at(0);

  return first?.id.startsWith(FOLDER_ID_PREFIX) === true;
};
