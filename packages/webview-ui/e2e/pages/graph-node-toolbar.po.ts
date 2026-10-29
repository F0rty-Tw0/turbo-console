import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';
import { packageToolbarLabelOf } from '../../src/graph/utils/controls-text.util.ts';
import type { NodeToolbarSide } from '../common/graph-folders.type.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { isInside, overlaps, readRect } from '../test/utils/element-rect.spec.util.ts';
import { nodeToolbarFaultsOf, rectOf } from '../test/utils/graph-widgets.spec.util.ts';

/** The keep-clear margin left of the overlay, less a pixel of rounding. */
const CLEAR_MARGIN_PX = 15;

/** Runs in the page through `evaluateAll`: the accessible names the buttons were given as `aria-label`. */
const ariaLabelsOf = (buttons: Element[]): (string | null)[] =>
  buttons.map((button): string | null => button.getAttribute('aria-label'));

/** The selected node's toolbar: where it sits beside its node. */
export class GraphNodeToolbar extends GraphWidgetsPage {
  public toolbarOf(name: string): Locator {
    return this.layer.getByRole('toolbar', { name: packageToolbarLabelOf(name), exact: true });
  }

  /** Exactly one package toolbar, its right edge on the selected package's, 4 px above or below the node's drawn box. */
  public async expectNodeToolbarOn(name: string, side: NodeToolbarSide): Promise<void> {
    await expect(this.layer.locator('.widget-toolbar-package')).toHaveCount(1);
    await expect.poll(async (): Promise<string[]> => this.nodeToolbarFaults(name, side)).toEqual([]);
  }

  /** No node toolbar is in the layer. */
  public async expectNoNodeToolbar(): Promise<void> {
    await expect(this.layer.locator('.widget-toolbar')).toHaveCount(0);
  }

  /** The toolbar's visible buttons are named `labels`, in DOM order. */
  public async expectToolbarButtons(name: string, labels: string[]): Promise<void> {
    const buttons = this.toolbarOf(name).getByRole('button');

    await expect.poll(async (): Promise<(string | null)[]> => buttons.evaluateAll(ariaLabelsOf)).toEqual(labels);
  }

  /** The node lies wholly inside the container, so a position check below it reads a node the user can see. */
  public async expectNodeInView(name: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isNodeInView(name)).toBe(true);
  }

  /** The package toolbar is drawn and shares no area with the folder's header row. */
  public async expectToolbarClearOfRow(name: string, folder: string): Promise<void> {
    await expect(this.rowOf(folder)).toBeVisible();
    await expect(this.toolbarOf(name)).toBeVisible();
    await expect.poll(async (): Promise<boolean> => this.isToolbarOnRow(name, folder)).toBe(false);
  }

  /** The package toolbar ends left of the open overlay with the keep-clear margin to spare. */
  public async expectNodeToolbarClear(name: string): Promise<void> {
    await expect(this.toolbarOf(name)).toBeVisible();
    await expect.poll(async (): Promise<number> => this.toolbarGap(name)).toBeGreaterThanOrEqual(CLEAR_MARGIN_PX);
  }

  private async isNodeInView(name: string): Promise<boolean> {
    const node = await this.nodeRectOf(name);
    const container: ElementRect = await this.container.evaluate(readRect);

    return isInside(node, container);
  }

  private async isToolbarOnRow(name: string, folder: string): Promise<boolean> {
    const toolbar = await rectOf(this.toolbarOf(name));
    const row = await rectOf(this.rowOf(folder));

    return overlaps(toolbar, row);
  }

  private async nodeToolbarFaults(name: string, side: NodeToolbarSide): Promise<string[]> {
    const node = await this.nodeRectOf(name);
    const zoom = await this.probe.zoom();
    const toolbar = await rectOf(this.toolbarOf(name));

    return nodeToolbarFaultsOf(node, toolbar, zoom, side);
  }

  /** How far left of the overlay's left edge the toolbar ends. */
  private async toolbarGap(name: string): Promise<number> {
    const toolbar = await rectOf(this.toolbarOf(name));
    const aside = await this.aside.evaluate(readRect);

    return aside.left - (toolbar.left + toolbar.width);
  }
}
