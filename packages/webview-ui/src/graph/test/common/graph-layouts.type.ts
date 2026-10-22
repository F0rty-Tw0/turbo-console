import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Mock, Mocked } from 'vitest';

import type { WebviewMessage } from '../../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';
import type { GraphReady } from '../../../bridge/common/graph-state.type.ts';
import type { GraphLayoutsDeps, LayoutScreen, LayoutView } from '../../common/graph-layouts.type.ts';
import type { LayoutResult, LayoutRunner } from '../../common/layout.type.ts';

/** A runner whose runs stay pending until the test settles them by index. */
export type LayoutRuns = {
  readonly runner: LayoutRunner;
  readonly count: () => number;
  readonly graphOf: (index: number) => ElkNode;
  /** Resolves run `index` with `result`, then lets every reaction to it run. */
  readonly settle: (index: number, result: LayoutResult | null) => Promise<void>;
};

/** The deps of a `GraphLayouts` under test and the doubles behind them. */
export type LayoutsRig = {
  readonly deps: GraphLayoutsDeps;
  readonly screen: Mocked<LayoutScreen>;
  readonly view: Mocked<LayoutView>;
  readonly runs: LayoutRuns;
  readonly onDrawn: Mock<GraphLayoutsDeps['onDrawn']>;
  readonly onPlaced: Mock<GraphLayoutsDeps['onPlaced']>;
  readonly onGroupingOff: Mock<GraphLayoutsDeps['onGroupingOff']>;
  /** Every message posted to the host so far, in order. */
  readonly posts: () => (WebviewMessage | GraphWebviewMessage)[];
  /** Sets what `deps.drawn()` answers: the drawn graph of `state`, or `null`. */
  readonly setDrawn: (state: GraphReady | null) => void;
};
