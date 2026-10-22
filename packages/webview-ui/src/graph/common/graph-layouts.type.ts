import type { DrawnGraph, GraphView, NodeSizer } from './graph-page.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

type NoNotice = {
  readonly kind: 'none';
};

type FallbackNotice = {
  readonly kind: 'fallback';
};

/** A layout of the checkbox's mode in flight while the other mode stays on screen; Retry hidden. */
type ProgressNotice = {
  readonly kind: 'progress';
  readonly text: string;
};

/** The notice line above the canvas: hidden, the simplified-layout copy with Retry, or a progress text. */
export type LayoutNotice = NoNotice | FallbackNotice | ProgressNotice;

/** What the layouts show around the canvas: the Loading message, the graph view, the notice. */
export type LayoutScreen = {
  readonly showLoading: () => void;
  readonly showGraph: (isFallback: boolean) => void;
  readonly showNotice: (notice: LayoutNotice) => void;
};

export type LayoutView = Pick<GraphView, 'setGraph' | 'setGrouping' | 'setPositions' | 'fit' | 'resize'>;

export type GraphLayoutsDeps = {
  readonly bridge: Bridge;
  readonly screen: LayoutScreen;
  readonly view: LayoutView;
  readonly runner: LayoutRunner;
  readonly sizeOf: NodeSizer;
  readonly drawn: () => DrawnGraph | null;
  /** After the first draw of a hash: the controller restores filters, inspection and camera. */
  readonly onDrawn: (saved: GraphViewState | null) => void;
  /** After every placement on screen: cache, layout result, switch, Re-layout. */
  readonly onPlaced: (mode: LayoutGrouping) => void;
  /** The checkbox turned grouping off, before the flat layout is placed. */
  readonly onGroupingOff: () => void;
};
