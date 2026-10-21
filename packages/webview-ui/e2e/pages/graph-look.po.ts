import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import { THEME_VAR_NAMES } from '../common/graph.const.ts';
import type { ExpectedThemeColors, ThemeStub } from '../common/graph.type.ts';
import { isPanNear, isZoomNear } from '../test/utils/graph-camera.spec.util.ts';
import { switchTheme, withoutSpaces } from '../test/utils/graph-theme.spec.util.ts';

type NodeColors = Pick<ExpectedThemeColors, 'fill' | 'frame' | 'label'>;

const colorsOf = (colors: NodeColors): NodeColors => {
  const plain: NodeColors = {
    fill: withoutSpaces(colors.fill),
    label: withoutSpaces(colors.label),
    frame: withoutSpaces(colors.frame)
  };

  return plain;
};

/** What the user sees of the drawn graph: the camera, the theme colours and the first frame, read through the probe. */
export class GraphLook {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  public async applyTheme(theme: ThemeStub): Promise<void> {
    await this.page.evaluate(switchTheme, { names: THEME_VAR_NAMES, theme });
  }

  /** Zoom and pan match `view` within a tolerance, and so does the selection. */
  public async expectView(view: GraphViewState): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isView(view)).toBe(true);
    await this.probe.expectSelected(view.selected);
  }

  /** The camera is not `view`: its zoom or its pan is off by more than the tolerance. */
  public async expectViewNot(view: GraphViewState): Promise<void> {
    const isView = await this.isView(view);

    expect(isView).toBe(false);
  }

  /** The node's fill, label and frame; spaces in the colours do not count. */
  public async expectNodeColors(id: string, colors: NodeColors): Promise<void> {
    const readColors = async (): Promise<NodeColors> => {
      const nodes = await this.probe.nodes();
      const node = nodes.find((candidate): boolean => candidate.id === id);
      const read: NodeColors = { fill: node?.fill ?? '', label: node?.label ?? '', frame: node?.frame ?? '' };

      return colorsOf(read);
    };

    await expect.poll(readColors).toEqual(colorsOf(colors));
  }

  public async expectEdgeColor(color: string): Promise<void> {
    const readColor = async (): Promise<string> => {
      const edgeColor = await this.probe.edgeColor();

      return withoutSpaces(edgeColor);
    };

    await expect.poll(readColor).toBe(withoutSpaces(color));
  }

  /** The selected node's frame differs from every other node's. */
  public async expectSelectedFrameDiffers(id: string): Promise<void> {
    const nodes = await this.probe.nodes();
    const others = nodes.filter((node): boolean => node.id !== id).map((node): string => node.frame);
    const selected = nodes.find((node): boolean => node.id === id)?.frame;

    expect(others).not.toContain(selected);
  }

  /** Polls until the first frame is measured, checks it, and records it as a test annotation. */
  public async expectFirstFrameUnder(ms: number): Promise<void> {
    await expect.poll(async (): Promise<number | null> => this.probe.firstFrameMs()).not.toBeNull();

    const measured = await this.probe.firstFrameMs();

    test.info().annotations.push({ type: 'first-frame-ms', description: String(measured) });
    expect(measured).toBeLessThan(ms);
  }

  private async isView(view: GraphViewState): Promise<boolean> {
    const zoom = await this.probe.zoom();
    const pan = await this.probe.pan();
    const isZoomClose = isZoomNear(zoom, view.zoom);
    const isPanClose = isPanNear(pan, view.pan);

    return isZoomClose && isPanClose;
  }
}
