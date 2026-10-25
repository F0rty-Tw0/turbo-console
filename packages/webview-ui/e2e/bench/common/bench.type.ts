/* eslint-disable local/type-placement -- the session names page objects, which have no .type.ts */

import type { Page } from '@playwright/test';

import type { Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { ElementRect } from '../../common/playwright.type.ts';
import type { GraphCanvas } from '../../pages/graph-canvas.po.ts';
import type { GraphFoldersPage } from '../../pages/graph-folders.po.ts';
import type { GraphGroupingPage } from '../../pages/graph-grouping.po.ts';
import type { GraphHost } from '../../pages/graph-host.po.ts';
import type { GraphProbePage } from '../../pages/graph-probe.po.ts';
import type { GraphTimings } from '../../pages/graph-timings.po.ts';
import type { GraphPage } from '../../pages/graph.po.ts';
import type { PanRecorder } from '../pan-recorder.ts';

/* eslint-enable local/type-placement */

export type BenchSample = {
  readonly name: string;
  readonly ms: number;
  readonly gate: boolean;
};

export type BenchRow = {
  readonly name: string;
  readonly medianNs: number;
  readonly samples: number;
  readonly gate: boolean;
};

export type LongTask = {
  readonly startTime: number;
  readonly duration: number;
};

/** What the page-side recorder holds: every frame time, every long task, and the pan window marks (`null` until set). */
export type RawPanTrace = {
  readonly frames: number[];
  readonly tasks: LongTask[];
  readonly tOn: number | null;
  readonly tOff: number | null;
};

export type PanTrace = {
  readonly frameDeltasMs: number[];
  readonly longestLongTaskMs: number;
};

export type PanHook = {
  markOn(): void;
  markOff(): void;
  read(): RawPanTrace;
};

export type BenchRowDef = {
  readonly name: string;
  readonly gate: boolean;
  readonly samples: number;
};

/** The page objects of one bench page; built by hand, since fixtures are bound to the test's own page. */
export type BenchSession = {
  readonly page: Page;
  readonly graphPage: GraphPage;
  readonly host: GraphHost;
  readonly timings: GraphTimings;
  readonly probe: GraphProbePage;
  readonly canvas: GraphCanvas;
  readonly grouping: GraphGroupingPage;
  readonly folders: GraphFoldersPage;
  readonly recorder: PanRecorder;
};

export type ColdOpen = {
  readonly firstFrameMs: number;
  readonly positions: Positions;
};

/** One stretch pan: the p95 frame time inside the pan window (FPS = 1000 / ms) and the longest long task in it. */
export type StretchPan = {
  readonly p95Ms: number;
  readonly longestLongTaskMs: number;
};

/** One L stretch session: its pan and the main JS heap in use after a forced collection. */
export type LargeSample = {
  readonly pan: StretchPan;
  readonly heapMb: number;
};

/** The container, every drawn node and the zoom, read together so a decision uses one picture of the canvas. */
export type CanvasReading = {
  readonly container: ElementRect;
  readonly nodes: ProbeNode[];
  readonly zoom: number;
};

/** The model-space size of the drawn nodes' centres. */
export type StretchExtent = {
  readonly width: number;
  readonly height: number;
};

/** What Fit made of the stretch graph: the zoom it settled at and the model extent it had to frame. */
export type StretchFit = {
  readonly zoom: number;
  readonly extent: StretchExtent;
};

/** One S open session: the first frame in ms, and the Fit it was framed by. */
export type OpenSample = {
  readonly firstFrameMs: number;
  readonly fit: StretchFit;
};

export type PanSample = {
  readonly cpuMs: number;
  readonly p95Ms: number;
  readonly longestLongTaskMs: number;
};

/* eslint-disable @typescript-eslint/naming-convention -- the init script sets this exact name on window */

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- only an interface merges into Window
  interface Window {
    __benchPan?: PanHook;
  }
}

/* eslint-enable @typescript-eslint/naming-convention */
