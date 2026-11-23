import type { DrawnGraph, GraphView, NodeSizer } from './graph-page.type.ts';
import type { LayoutEngine } from './graph-probe.type.ts';
import type { FallbackCause, LayoutRunner } from './layout.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

type NoNotice = {
  readonly kind: 'none';
};

/** A fallback layout after ELK failed or timed out. */
type FallbackNotice = {
  readonly kind: 'fallback';
};

/** A fallback layout of a graph past `ELK_NODES_MAX`, where ELK never ran. */
type OversizeNotice = {
  readonly kind: 'oversize';
};

/** A layout of the checkbox's mode in flight while the other mode stays on screen; Retry hidden. */
type ProgressNotice = {
  readonly kind: 'progress';
  readonly text: string;
};

/** The notice line above the canvas: hidden, a simplified-layout copy with Retry, or a progress text. */
export type LayoutNotice = NoNotice | FallbackNotice | OversizeNotice | ProgressNotice;

/** What the layouts show around the canvas: the Loading message, the graph view with its fallback's notice, the notice. */
export type LayoutScreen = {
  readonly showLoading: () => void;
  readonly showGraph: (fallbackCause: FallbackCause | null) => void;
  readonly showNotice: (notice: LayoutNotice) => void;
};

/** What keeping a drag reads and writes of the layout snapshots (`GraphLayoutSnapshots`). */
export type DragSnapshots = {
  readonly drag: (mode: LayoutGrouping, positions: Positions, touched: string[]) => void;
  readonly routesOf: (mode: LayoutGrouping) => Routes;
  readonly engineOf: (mode: LayoutGrouping) => LayoutEngine | null;
};

export type LayoutView = Pick<GraphView, 'setGraph' | 'setGrouping' | 'setPositions' | 'relinkFolders' | 'fit' | 'resize'>;

export type GraphLayoutsDeps = {
  readonly bridge: Bridge;
  readonly screen: LayoutScreen;
  readonly view: LayoutView;
  readonly runner: LayoutRunner;
  readonly sizeOf: NodeSizer;
  readonly drawn: () => DrawnGraph | null;
  /** After the first draw of a hash: the controller restores filters, inspection and camera. */
  readonly onDrawn: (saved: GraphViewState | null) => void;
  /** After every placement on screen: cache, layout result, switch, Re-layout; a first draw calls it after `onDrawn`. */
  readonly onPlaced: (mode: LayoutGrouping) => void;
  /** The checkbox turned grouping off, before the flat layout is placed. */
  readonly onGroupingOff: () => void;
};
