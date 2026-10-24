import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { PageClock } from './page-clock.po.ts';
import { FLOW_CLASS } from '../../src/graph/common/flow.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { FALLBACK_COLORS, GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import type { FlowEdgeShot, FlowInk } from '../common/graph-flow.type.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { readEdgeColours, readFlowInk } from '../test/utils/graph-flow-ink.spec.util.ts';
import { emptySpotOf } from '../test/utils/graph-geometry.spec.util.ts';

const FRAME_MS = 16;

/** Each pointer nudge moves this far right, staying on the node it rests on. */
const NUDGE_PX = 2;

const DRAG_STEPS = 8;

/** One 12 px dash cycle around an edge's middle, a pixel apart. */
const EDGE_STEPS = Array.from({ length: 13 }, (_, index: number): number => index - 6);

const EDGE_CLIP_HALF_PX = 10;

const EDGE_CLIP_PX = EDGE_CLIP_HALF_PX * 2 + 1;

/** The test page sets no theme variables, so the graph and the overlay draw in the fallback colours. */
const FLOW_COLORS = { highlighted: FALLBACK_COLORS.highlighted, background: FALLBACK_COLORS.background };

const readImage = (canvas: HTMLCanvasElement): string => canvas.toDataURL();

const readPointerEvents = (canvas: HTMLCanvasElement): string => getComputedStyle(canvas).pointerEvents;

const readNextClass = (canvas: HTMLCanvasElement): string => canvas.nextElementSibling?.className ?? '';

/**
 * The flow overlay `canvas.graph-flow` under the page's fake clock, and the pointer on the graph while it runs. Nothing
 * here waits for a frame: the paused fake clock runs one only on `tick`.
 */
export class GraphFlowPage {
  public readonly canvas: Locator;
  public readonly container: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly clock: PageClock;
  private pointer: ViewportPoint | null;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.clock = new PageClock(page);
    this.pointer = null;
    this.canvas = page.locator(`canvas.${FLOW_CLASS}`);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
  }

  /** Ticks one frame per poll until the posted graph's nodes are drawn. */
  public async waitForLayout(): Promise<void> {
    await this.waitForNodes((nodes: ProbeNode[]): boolean => nodes.length > 0);
  }

  /** Ticks one frame per poll until node `id` is drawn. */
  public async waitForNode(id: string): Promise<void> {
    const isNode = (node: ProbeNode): boolean => node.id === id;

    await this.waitForNodes((nodes: ProbeNode[]): boolean => nodes.some(isNode));
  }

  public async tap(id: string): Promise<void> {
    await this.hover(id);
    await this.page.mouse.down();
    await this.page.mouse.up();
  }

  /** Drags the camera by (`dx`, `dy`) from an empty spot of the canvas. */
  public async pan(dx: number, dy: number): Promise<void> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.probe.nodes();
    const edges = await this.probe.edges();
    const spot: ViewportPoint = emptySpotOf(container, nodes, edges, zoom);

    await this.page.mouse.move(spot.x, spot.y);
    await this.page.mouse.down();
    await this.page.mouse.move(spot.x + dx, spot.y + dy, { steps: DRAG_STEPS });
    await this.page.mouse.up();
  }

  /** Moves the pointer onto node `id` without waiting for a frame, which the paused fake clock would never run. */
  public async hover(id: string): Promise<void> {
    const node = await this.nodeOf(id);
    const point: ViewportPoint = { x: node.renderedX, y: node.renderedY };

    this.pointer = point;
    await this.page.mouse.move(point.x, point.y);
  }

  /** Moves the pointer a little, still on the node `hover` put it on. */
  public async nudge(): Promise<void> {
    const point = this.pointer;

    if (point === null) throw new Error('graph e2e: nudge before hover');

    const moved: ViewportPoint = { x: point.x + NUDGE_PX, y: point.y };

    this.pointer = moved;
    await this.page.mouse.move(moved.x, moved.y);
  }

  /** The OS asks for reduced motion; the flow reads it at each highlight. */
  public async reduceMotion(): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: 'reduce' });
  }

  /** Moves the fake clock on by `ms`, one 16 ms frame at a time. */
  public async tick(ms: number): Promise<void> {
    for (let passed = 0; passed < ms; passed += FRAME_MS) await this.clock.tick(FRAME_MS);
  }

  /** Ticks one frame per poll until the overlay has no ink; the fake clock reaches `FLOW_IDLE_MS` only after far more polls. */
  public async waitForClear(): Promise<void> {
    const isClear = async (): Promise<boolean> => {
      await this.clock.tick(FRAME_MS);

      return (await this.inkCount()) === 0;
    };

    await expect.poll(isClear).toBe(true);
  }

  /** The pixels with alpha above 0. */
  public async inkCount(): Promise<number> {
    const ink = await this.ink();

    return ink.count;
  }

  /** The overlay as a PNG data URL. */
  public async image(): Promise<string> {
    return this.canvas.evaluate(readImage);
  }

  /** The box around the inked pixels in CSS px; throws when nothing is inked. */
  public async inkBounds(): Promise<ElementRect> {
    const { bounds } = await this.ink();

    if (bounds === null) throw new Error('graph e2e: the flow overlay has no ink');

    return bounds;
  }

  public async expectInked(isInked: boolean): Promise<void> {
    const count = await this.inkCount();

    expect(count > 0).toBe(isInked);
  }

  /** Clicks pass through the overlay, and the widget layer follows it in the DOM, so it paints above it. */
  public async expectUnderWidgets(): Promise<void> {
    const pointerEvents = await this.canvas.evaluate(readPointerEvents);
    const nextClass = await this.canvas.evaluate(readNextClass);

    expect(pointerEvents).toBe('none');
    expect(nextClass).toBe('graph-widgets');
  }

  /**
   * A screenshot of the page, the graph canvas and the overlay together, read at the 13 px of the straight edge from
   * `source` to `target` around its middle: one dash cycle, each `h` for the highlight colour, `b` for the background.
   */
  public async edgeColours(source: string, target: string): Promise<string> {
    const from = await this.nodeOf(source);
    const to = await this.nodeOf(target);
    const length = Math.hypot(to.renderedX - from.renderedX, to.renderedY - from.renderedY);
    const unit: ViewportPoint = { x: (to.renderedX - from.renderedX) / length, y: (to.renderedY - from.renderedY) / length };
    const middle: ViewportPoint = { x: (from.renderedX + to.renderedX) / 2, y: (from.renderedY + to.renderedY) / 2 };
    const clip = {
      x: Math.round(middle.x) - EDGE_CLIP_HALF_PX,
      y: Math.round(middle.y) - EDGE_CLIP_HALF_PX,
      width: EDGE_CLIP_PX,
      height: EDGE_CLIP_PX
    };
    const pointOf = (step: number): ViewportPoint => {
      const point: ViewportPoint = {
        x: Math.round(middle.x + unit.x * step) - clip.x,
        y: Math.round(middle.y + unit.y * step) - clip.y
      };

      return point;
    };
    const points = EDGE_STEPS.map(pointOf);
    const shot = await this.page.screenshot({ clip });
    const input: FlowEdgeShot = { png: shot.toString('base64'), points, ...FLOW_COLORS };

    return this.page.evaluate(readEdgeColours, input);
  }

  private async waitForNodes(isDrawn: (nodes: ProbeNode[]) => boolean): Promise<void> {
    const isReady = async (): Promise<boolean> => {
      await this.clock.tick(FRAME_MS);

      const nodes = await this.probe.nodes();

      return isDrawn(nodes);
    };

    await expect.poll(isReady).toBe(true);
  }

  private async ink(): Promise<FlowInk> {
    return this.canvas.evaluate(readFlowInk);
  }

  private async nodeOf(id: string): Promise<ProbeNode> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: no node ${id} is drawn`);

    return node;
  }
}
