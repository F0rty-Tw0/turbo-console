import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { READ_LONG_TASKS } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/graph.type.ts';
import { withoutSpaces } from '../test/utils/graph-theme.spec.util.ts';

const ZOOM_TOLERANCE = 0.01;

const PAN_TOLERANCE_PX = 1;

type NodeColors = Pick<ThemeColors, 'fill' | 'frame' | 'label'>;

const colorsOf = (colors: NodeColors): NodeColors => {
  const plain: NodeColors = {
    fill: withoutSpaces(colors.fill),
    label: withoutSpaces(colors.label),
    frame: withoutSpaces(colors.frame)
  };

  return plain;
};

const isZoomNear = (zoom: number, view: GraphViewState): boolean => Math.abs(zoom - view.zoom) / view.zoom <= ZOOM_TOLERANCE;

/** What the user sees of the drawn graph: the camera, the theme colours and the first frame, read through the probe. */
export class GraphLook {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Zoom and pan match `view` within a tolerance, and so does the selection. */
  public async expectView(view: GraphViewState): Promise<void> {
    const selected = async (): Promise<unknown> => this.page.evaluate<unknown>('window.__tcGraphProbe.selected()');

    await expect.poll(async (): Promise<boolean> => this.isView(view)).toBe(true);
    await expect.poll(selected).toBe(view.selected);
  }

  public async expectViewNot(view: GraphViewState): Promise<void> {
    const zoom = await this.page.evaluate<number>('window.__tcGraphProbe.zoom()');

    expect(isZoomNear(zoom, view)).toBe(false);
  }

  /** The node's fill, label and frame; spaces in the colours do not count. */
  public async expectNodeColors(id: string, colors: NodeColors): Promise<void> {
    const readColors = async (): Promise<NodeColors> => {
      const nodes = await this.nodes();
      const node = nodes.find((candidate): boolean => candidate.id === id);

      return colorsOf({ fill: node?.fill ?? '', label: node?.label ?? '', frame: node?.frame ?? '' });
    };

    await expect.poll(readColors).toEqual(colorsOf(colors));
  }

  public async expectEdgeColor(color: string): Promise<void> {
    const readColor = async (): Promise<string> =>
      withoutSpaces(await this.page.evaluate<string>('window.__tcGraphProbe.edgeColor()'));

    await expect.poll(readColor).toBe(withoutSpaces(color));
  }

  /** The selected node's frame differs from every other node's. */
  public async expectSelectedFrameDiffers(id: string): Promise<void> {
    const nodes = await this.nodes();
    const others = nodes.filter((node): boolean => node.id !== id).map((node): string => node.frame);
    const selected = nodes.find((node): boolean => node.id === id)?.frame;

    expect(others).not.toContain(selected);
  }

  /** Polls until the first frame is measured, checks it, and records it as a test annotation. */
  public async expectFirstFrameUnder(ms: number): Promise<void> {
    const frameMs = async (): Promise<number | null> => this.page.evaluate<number | null>('window.__tcGraphProbe.firstFrameMs()');

    await expect.poll(frameMs).not.toBeNull();

    const measured = await frameMs();

    test.info().annotations.push({ type: 'first-frame-ms', description: String(measured) });
    expect(measured).toBeLessThan(ms);
  }

  public async expectLongTasks(maxCount: number, maxMs: number): Promise<void> {
    const durations = await this.page.evaluate<number[]>(READ_LONG_TASKS);
    const longest = Math.max(0, ...durations);

    test.info().annotations.push({ type: 'long-tasks', description: String(durations.length) });
    test.info().annotations.push({ type: 'longest-long-task-ms', description: String(longest) });
    expect(durations.length).toBeLessThanOrEqual(maxCount);
    expect(longest).toBeLessThanOrEqual(maxMs);
  }

  private async isView(view: GraphViewState): Promise<boolean> {
    const zoom = await this.page.evaluate<number>('window.__tcGraphProbe.zoom()');
    const pan = await this.page.evaluate<GraphViewState['pan']>('window.__tcGraphProbe.pan()');
    const isPanNear = Math.abs(pan.x - view.pan.x) <= PAN_TOLERANCE_PX && Math.abs(pan.y - view.pan.y) <= PAN_TOLERANCE_PX;

    return isZoomNear(zoom, view) && isPanNear;
  }

  private async nodes(): Promise<ProbeNode[]> {
    return this.page.evaluate<ProbeNode[]>('window.__tcGraphProbe.nodes()');
  }
}
