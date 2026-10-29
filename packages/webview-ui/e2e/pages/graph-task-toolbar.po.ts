import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphNodeToolbar } from './graph-node-toolbar.po.ts';
import { taskToolbarLabelOf } from '../../src/graph/utils/controls-text.util.ts';

/** The selected task's node toolbar: the package toolbar's expectations, read from the task toolbar's root. */
export class GraphTaskToolbar extends GraphNodeToolbar {
  protected override readonly toolbarSelector: string = '.widget-toolbar-task';

  public override toolbarOf(id: string): Locator {
    return this.layer.getByRole('toolbar', { name: taskToolbarLabelOf(id), exact: true });
  }

  /** No task toolbar is drawn. */
  public async expectNoTaskToolbar(): Promise<void> {
    await expect(this.layer.locator('.widget-toolbar-task:not([hidden])')).toHaveCount(0);
  }
}
