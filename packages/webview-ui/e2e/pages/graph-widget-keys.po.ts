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
   * Pans the canvas left until the expanded folder's chevron lies a pixel past the container's left edge. The panels
   * that narrow the container mount with the graph state, and the layer takes the container's new rect one
   * ResizeObserver callback later; a chevron read in between sits off by the container's left edge and flips the pan to
   * the right (macOS CI). So the read waits for `expectLayerSettledOn` the chevron.
   */
  public async panChevronOffLeft(folder: string): Promise<void> {
    const chevronLocator = this.chevronOf(folder, true);

    await this.expectLayerSettledOn(chevronLocator);
    const chevron = await chevronLocator.evaluate(readRect);
    const container = await this.container.evaluate(readRect);

    this.pannedPx = -(chevron.left + chevron.width - container.left + 1);
    await this.canvas.panBy(this.pannedPx, 0);
  }

  /** The expanded chevron is in the DOM but hidden, so a chevron that is gone or renamed by a collapse does not pass. */
  public async expectChevronHidden(folder: string): Promise<void> {
    const name = `Collapse ${folderTitleOf(folder)}`;
    const chevron = this.layer.getByRole('button', { name, exact: true, includeHidden: true });

    await expect(chevron).toBeAttached();
    await expect(chevron).toBeHidden();
  }

  /** Undoes the last `panChevronOffLeft`. */
  public async panBack(): Promise<void> {
    await this.canvas.panBy(-this.pannedPx, 0);
    this.pannedPx = 0;
  }
}
