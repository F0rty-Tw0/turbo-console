import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphCamera } from './graph-camera.po.ts';
import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphPage } from './graph.po.ts';
import type { GraphState } from '../../src/bridge/common/graph-state.type.ts';
import { OPEN_ZOOM_FLOOR } from '../../src/graph/common/graph-layout.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';

const ANCHOR_TOLERANCE_PX = 3;

const ZOOM_DIGITS = 6;

type NodeEdges = {
  readonly top: number;
  readonly left: number;
  readonly right: number;
};

/** The top, left and right edge of a node drawn at `zoom`, in viewport px, from its rendered centre and model size. */
const edgesOf = (zoom: number): ((node: ProbeNode) => NodeEdges) => {
  return (node: ProbeNode): NodeEdges => {
    const halfWidth = (node.width * zoom) / 2;
    const edges: NodeEdges = {
      top: node.renderedY - (node.height * zoom) / 2,
      left: node.renderedX - halfWidth,
      right: node.renderedX + halfWidth
    };

    return edges;
  };
};

/** What the camera does at open: the floored zoom, its top-centre anchor, and Fit still fitting. */
export class GraphOpenZoom {
  private readonly camera: GraphCamera;
  private readonly graph: GraphPage;
  private readonly host: GraphHost;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.camera = new GraphCamera(page);
    this.graph = new GraphPage(page);
    this.host = new GraphHost(page);
    this.probe = new GraphProbePage(page);
  }

  /** Opens the page with `options` and sends `state`. */
  public async openWith(state: GraphState, options: GraphOptions = {}): Promise<void> {
    await this.graph.open(options);
    await this.host.sendState(state);
  }

  /** Reloads the page with the view state it saved and sends `state` again. */
  public async reopenWith(state: GraphState): Promise<void> {
    await this.host.reopen();
    await this.host.sendState(state);
  }

  public async expectZoom(zoom: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.probe.zoom()).toBeCloseTo(zoom, ZOOM_DIGITS);
  }

  /** The zoom is a true fit, under the opening floor; a failure prints the zoom. */
  public async expectZoomBelowFloor(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.probe.zoom()).toBeLessThan(OPEN_ZOOM_FLOOR);
  }

  /** A Fit press keeps the zoom the camera has now. */
  public async expectFitKeepsZoom(): Promise<void> {
    const before = await this.probe.zoom();
    const after = await this.fitZoom();

    expect(after).toBeCloseTo(before, ZOOM_DIGITS);
  }

  /** Presses Fit and returns the zoom it lands on. */
  private async fitZoom(): Promise<number> {
    await this.graph.pressButton(FIT_LABEL);
    await this.graph.waitFrames();

    return this.probe.zoom();
  }

  /** The zoom as the page opened it, once its layout has landed, equals the zoom Fit lands on. */
  public async expectOpenedAtFit(): Promise<void> {
    await this.probe.expectLayoutSettled();

    const opened = await this.probe.zoom();
    const fitted = await this.fitZoom();

    expect(opened).toBeCloseTo(fitted, ZOOM_DIGITS);
  }

  /** The packages' hull starts `pad` px below the canvas top and its middle is the canvas middle; for a flat graph, whose hull is its nodes. */
  public async expectTopCentred(pad: number): Promise<void> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const canvas = await this.camera.canvas.evaluate(readRect);
    const edges = nodes.map(edgesOf(zoom));
    const tops = edges.map((edge: NodeEdges): number => edge.top);
    const lefts = edges.map((edge: NodeEdges): number => edge.left);
    const rights = edges.map((edge: NodeEdges): number => edge.right);
    const top = Math.min(...tops) - canvas.top;
    const middle = (Math.min(...lefts) + Math.max(...rights)) / 2 - canvas.left;

    expect(Math.abs(top - pad)).toBeLessThanOrEqual(ANCHOR_TOLERANCE_PX);
    expect(Math.abs(middle - canvas.width / 2)).toBeLessThanOrEqual(ANCHOR_TOLERANCE_PX);
  }
}
