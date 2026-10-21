import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { GraphTimings } from './graph-timings.po.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import { DEPTH_LABEL, SEARCH_LABEL, TAGS_LABEL } from '../../src/graph/common/graph.const.ts';
import { THEME_VAR_NAMES } from '../common/graph.const.ts';
import type { ControlsFields, ExpectedThemeColors, ThemeStub } from '../common/graph.type.ts';
import { isPanNear, isZoomNear } from '../test/utils/graph-camera.spec.util.ts';
import { checkedTagNames, lockedShowNames, uncheckedShowNames } from '../test/utils/graph-controls-fields.spec.util.ts';
import { effectiveOpacityOf } from '../test/utils/graph-controls.spec.util.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';
import { switchTheme, withoutSpaces } from '../test/utils/graph-theme.spec.util.ts';

type NodeColors = Pick<ExpectedThemeColors, 'fill' | 'frame' | 'label'>;

const SHOW_ROW = /^Show /;

const colorsOf = (colors: NodeColors): NodeColors => {
  const plain: NodeColors = {
    fill: withoutSpaces(colors.fill),
    label: withoutSpaces(colors.label),
    frame: withoutSpaces(colors.frame)
  };

  return plain;
};

/** What the user sees of the drawn graph: the camera, the theme colours, the controls and the timing facts, read through the probe. */
export class GraphLook {
  public readonly depth: Locator;
  public readonly rowChecks: Locator;
  public readonly searchBox: Locator;
  public readonly tagChecks: Locator;
  public readonly toggleButton: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly timings: GraphTimings;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.timings = new GraphTimings(page);
    this.toggleButton = page.getByRole('button', { name: /^Controls/ });
    this.searchBox = page.getByRole('searchbox', { name: SEARCH_LABEL, exact: true, includeHidden: true });
    this.depth = page.getByRole('spinbutton', { name: DEPTH_LABEL, exact: true, includeHidden: true });
    this.rowChecks = page.getByRole('checkbox', { name: SHOW_ROW, includeHidden: true });
    const tagGroup = page.getByRole('group', { name: TAGS_LABEL, exact: true, includeHidden: true });

    this.tagChecks = tagGroup.getByRole('checkbox', { includeHidden: true });
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

  /** The panel's own inputs, hidden ones included, show exactly these fields; list order does not count. */
  public async expectControlsFields(fields: ControlsFields): Promise<void> {
    const expected: ControlsFields = { ...fields, hidden: sortedNames(fields.hidden), tags: sortedNames(fields.tags) };

    await expect.poll(async (): Promise<ControlsFields> => this.controlsFields()).toEqual(expected);
  }

  /** Polls until the first frame is measured, checks it, and records it as a test annotation. */
  public async expectFirstFrameUnder(ms: number): Promise<void> {
    await expect.poll(async (): Promise<number | null> => this.timings.firstFrameMs()).not.toBeNull();

    const measured = await this.timings.firstFrameMs();

    test.info().annotations.push({ type: 'first-frame-ms', description: String(measured) });
    expect(measured).toBeLessThan(ms);
  }

  /** The package's name in the list is drawn at `opacity`, every ancestor's included, as nested opacities multiply. */
  public async expectNameOpacity(name: string, opacity: number): Promise<void> {
    const button = this.page.getByRole('grid').getByRole('button', { name, exact: true });

    await expect.poll(async (): Promise<number> => button.evaluate(effectiveOpacityOf)).toBe(opacity);
  }

  private async controlsFields(): Promise<ControlsFields> {
    const expanded = await this.toggleButton.getAttribute('aria-expanded');
    const search = await this.searchBox.inputValue();
    const depth = await this.depth.inputValue();
    const hidden = await this.rowChecks.evaluateAll(uncheckedShowNames);
    const locked = await this.rowChecks.evaluateAll(lockedShowNames);
    const tags = await this.tagChecks.evaluateAll(checkedTagNames);
    const fields: ControlsFields = {
      controlsOpen: expanded === 'true',
      search,
      depth: Number(depth),
      hidden: sortedNames(hidden),
      focus: locked[0] ?? null,
      tags: sortedNames(tags)
    };

    return fields;
  }

  private async isView(view: GraphViewState): Promise<boolean> {
    const zoom = await this.probe.zoom();
    const pan = await this.probe.pan();
    const isZoomClose = isZoomNear(zoom, view.zoom);
    const isPanClose = isPanNear(pan, view.pan);

    return isZoomClose && isPanClose;
  }
}
