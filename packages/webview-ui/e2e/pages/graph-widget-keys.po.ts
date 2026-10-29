import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';
import { folderTitleOf } from '../../src/graph/utils/controls-text.util.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';

/** A folder row as a toolbar: its one Tab stop, and pans that hide its chevron. */
export class GraphWidgetKeys extends GraphWidgetsPage {
  private pannedPx = 0;

  /** The folder row's toolbar, named by its title. */
  public toolbarOf(folder: string): Locator {
    return this.layer.getByRole('toolbar', { name: folderTitleOf(folder), exact: true });
  }

  public async expectOneToolbar(folder: string): Promise<void> {
    await expect(this.toolbarOf(folder)).toHaveCount(1);
  }

  /**
   * Pans the canvas left until the expanded folder's chevron lies a pixel past the container's left edge. The layer
   * takes the container's rect on the next ResizeObserver callback; a chevron read before that sits off by the
   * container's left edge and flips the pan to the right (macOS CI).
   */
  public async panChevronOffLeft(folder: string): Promise<void> {
    await this.expectLayerAfterContainer();
    const chevron = await this.chevronOf(folder, true).evaluate(readRect);
    const container = await this.container.evaluate(readRect);

    this.pannedPx = -(chevron.left + chevron.width - container.left + 1);
    await this.canvas.panBy(this.pannedPx, 0);
  }

  public async expectChevronHidden(folder: string): Promise<void> {
    await expect(this.chevronOf(folder, true)).toBeHidden();
  }

  /** Undoes the last `panChevronOffLeft`. */
  public async panBack(): Promise<void> {
    await this.canvas.panBy(-this.pannedPx, 0);
    this.pannedPx = 0;
  }
}
