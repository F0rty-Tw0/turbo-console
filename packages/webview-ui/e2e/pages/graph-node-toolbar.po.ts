import { expect } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';
import type { NodeToolbarSide } from '../common/graph-folders.type.ts';
import { nodeToolbarFaultsOf, rectOf } from '../test/utils/graph-widgets.spec.util.ts';

/** The selected node's toolbar: where it sits beside its node. */
export class GraphNodeToolbar extends GraphWidgetsPage {
  /** Exactly one package "…", its right edge on the selected package's, 4 px above or below the node's drawn box. */
  public async expectNodeToolbarOn(name: string, side: NodeToolbarSide): Promise<void> {
    await expect(this.layer.locator('.widget-package-button')).toHaveCount(1);
    await expect.poll(async (): Promise<string[]> => this.nodeToolbarFaults(name, side)).toEqual([]);
  }

  private async nodeToolbarFaults(name: string, side: NodeToolbarSide): Promise<string[]> {
    const node = await this.nodeRectOf(name);
    const zoom = await this.probe.zoom();
    const toolbar = await rectOf(this.packageButton(name));

    return nodeToolbarFaultsOf(node, toolbar, zoom, side);
  }
}
