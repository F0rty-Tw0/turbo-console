import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphNodeToolbar } from './graph-node-toolbar.po.ts';
import { taskToolbarLabelOf } from '../../src/graph/utils/controls-text.util.ts';
import type { NodeToolbarSide } from '../common/graph-folders.type.ts';

/** The selected task's node toolbar: the package toolbar's expectations, read from the task toolbar's root. */
export class GraphTaskToolbar extends GraphNodeToolbar {
  public override toolbarOf(id: string): Locator {
    return this.layer.getByRole('toolbar', { name: taskToolbarLabelOf(id), exact: true });
  }

  /** Exactly one task toolbar, its right edge on the selected task's, 4 px above or below the node's drawn box. */
  public async expectTaskToolbarOn(id: string, side: NodeToolbarSide): Promise<void> {
    await expect(this.layer.locator('.widget-toolbar-task')).toHaveCount(1);
    await expect.poll(async (): Promise<string[]> => this.nodeToolbarFaults(id, side)).toEqual([]);
  }

  /** No task toolbar is drawn. */
  public async expectNoTaskToolbar(): Promise<void> {
    await expect(this.layer.locator('.widget-toolbar-task:not([hidden])')).toHaveCount(0);
  }
}
