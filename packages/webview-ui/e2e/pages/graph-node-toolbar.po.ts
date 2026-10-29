import { expect } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';
import type { NodeToolbarSide } from '../common/graph-folders.type.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { isInside, overlaps, readRect } from '../test/utils/element-rect.spec.util.ts';
import { nodeToolbarFaultsOf, rectOf } from '../test/utils/graph-widgets.spec.util.ts';

/** The selected node's toolbar: where it sits beside its node. */
export class GraphNodeToolbar extends GraphWidgetsPage {
  /** Exactly one package "…", its right edge on the selected package's, 4 px above or below the node's drawn box. */
  public async expectNodeToolbarOn(name: string, side: NodeToolbarSide): Promise<void> {
    await expect(this.layer.locator('.widget-package-button')).toHaveCount(1);
    await expect.poll(async (): Promise<string[]> => this.nodeToolbarFaults(name, side)).toEqual([]);
  }

  /** The node lies wholly inside the container, so a position check below it reads a node the user can see. */
  public async expectNodeInView(name: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isNodeInView(name)).toBe(true);
  }

  /** The package "…" is drawn and shares no area with the folder's header row. */
  public async expectToolbarClearOfRow(name: string, folder: string): Promise<void> {
    await expect(this.rowOf(folder)).toBeVisible();
    await expect(this.packageButton(name)).toBeVisible();
    await expect.poll(async (): Promise<boolean> => this.isToolbarOnRow(name, folder)).toBe(false);
  }

  private async isNodeInView(name: string): Promise<boolean> {
    const node = await this.nodeRectOf(name);
    const container: ElementRect = await this.container.evaluate(readRect);

    return isInside(node, container);
  }

  private async isToolbarOnRow(name: string, folder: string): Promise<boolean> {
    const toolbar = await rectOf(this.packageButton(name));
    const row = await rectOf(this.rowOf(folder));

    return overlaps(toolbar, row);
  }

  private async nodeToolbarFaults(name: string, side: NodeToolbarSide): Promise<string[]> {
    const node = await this.nodeRectOf(name);
    const zoom = await this.probe.zoom();
    const toolbar = await rectOf(this.packageButton(name));

    return nodeToolbarFaultsOf(node, toolbar, zoom, side);
  }
}
