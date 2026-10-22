/* eslint-disable no-underscore-dangle -- the page and its init scripts expose these exact names on window */
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphBoxesPage } from './graph-boxes.po.ts';
import type { LayoutGrouping } from '../../src/bridge/common/graph-message.type.ts';
import type { Positions } from '../../src/bridge/common/graph-state.type.ts';
import {
  CLEAR_LABEL,
  CONTROLS_LABEL,
  DETAILS_LABEL,
  FIT_LABEL,
  GROUP_BY_FOLDER_LABEL,
  LOADING_TEXT,
  RELAYOUT_LABEL
} from '../../src/graph/common/graph.const.ts';
import { readGraphViewState } from '../../src/graph/utils/graph-view-state.util.ts';
import { ONE_FRAME } from '../common/graph.const.ts';
import type { PositionsMessage } from '../common/graph.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { boxGrabOf, clipFaultsOf, folderKeyed, inViewCountOf } from '../test/utils/graph-folders.spec.util.ts';
import { positionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

const TOOLBAR_LABELS = [CONTROLS_LABEL, DETAILS_LABEL, FIT_LABEL, RELAYOUT_LABEL, CLEAR_LABEL];

const CANVAS_TOLERANCE_PX = 1;

const BOX_DRAG_STEPS = 8;

const groupingOf = (message: PositionsMessage): LayoutGrouping => message.grouping;

/** The Group by folder checkbox, its layout notice, the held worker and the grouping the page posts and saves, plus the boxes. */
export class GraphGroupingPage extends GraphBoxesPage {
  public readonly checkbox: Locator;
  public readonly notice: Locator;

  public constructor(page: Page) {
    super(page);
    this.checkbox = page.getByRole('checkbox', { name: GROUP_BY_FOLDER_LABEL, exact: true });
    this.notice = page.locator('.graph-notice-text');
  }

  public async setGrouped(isOn: boolean): Promise<void> {
    await this.checkbox.setChecked(isOn);
  }

  /** Sends every message queued for the held workers, in order, and lets later ones through. */
  public async releaseWorker(): Promise<void> {
    await this.page.evaluate((): void => window.__releaseWorker?.());
  }

  public async holdWorker(): Promise<void> {
    await this.page.evaluate((): void => window.__holdWorker?.());
  }

  /** Drags the folder's box by `dx`, `dy` CSS pixels, held in its left padding band. */
  public async dragBox(folder: string, dx: number, dy: number): Promise<void> {
    const folders = await this.folders();
    const zoom = await this.probe.zoom();
    const grab = boxGrabOf(folderKeyed(folders, folder), zoom);

    await this.page.mouse.move(grab.x, grab.y);
    await this.page.mouse.down();
    await this.page.mouse.move(grab.x + dx, grab.y + dy, { steps: BOX_DRAG_STEPS });
    await this.page.mouse.up();
  }

  /** The visible notice text, `null` while the notice is hidden. */
  public async noticeText(): Promise<string | null> {
    const isShown = await this.notice.isVisible();

    if (!isShown) return null;

    return this.notice.innerText();
  }

  /** The positions of the last `positions` message the page posted. */
  public async postedPositions(): Promise<Positions> {
    const posted = await readPosted(this.page);
    const last = positionsPosted(posted).at(-1);

    if (last === undefined) throw new Error('graph e2e: no positions message was posted');

    return last.positions;
  }

  /**
   * The canvas is the container's size again: Cytoscape's resize runs about 100 ms after a notice moves the container,
   * and until then a mouse press lands that many pixels off its node.
   */
  public async expectCanvasFitsContainer(): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isCanvasFitting()).toBe(true);
  }

  public async expectGrouped(isOn: boolean): Promise<void> {
    await expect(this.checkbox).toBeChecked({ checked: isOn });
    await expect.poll(async (): Promise<boolean | null> => this.groupedFact()).toBe(isOn);
  }

  /** The view state the page saved holds Group by folder as `isOn`. */
  public async expectGroupedSaved(isOn: boolean): Promise<void> {
    await expect.poll(async (): Promise<boolean | null> => this.savedGrouped()).toBe(isOn);
  }

  /** The view state the page saved holds exactly these collapsed folders. */
  public async expectCollapsedSaved(folders: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[] | null> => this.savedCollapsed()).toEqual(folders);
  }

  /** The notice shows exactly `text`, or is hidden for `null`. */
  public async expectNotice(text: string | null): Promise<void> {
    if (text === null) {
      await expect(this.notice).toBeHidden();

      return;
    }

    await expect(this.notice).toBeVisible();
    await expect(this.notice).toHaveText(text);
  }

  /** The graph container and every toolbar button are shown, and Loading is not. */
  public async expectToolbarShown(): Promise<void> {
    await expect(this.container).toBeVisible();
    await expect(this.page.getByText(LOADING_TEXT, { exact: true })).toBeHidden();

    for (const label of TOOLBAR_LABELS) await expect(this.page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  /** The last `positions` message the page posted is for `grouping`. */
  public async expectPostedGrouping(grouping: LayoutGrouping): Promise<void> {
    await expect.poll(async (): Promise<LayoutGrouping | undefined> => this.lastPostedGrouping()).toBe(grouping);
  }

  /** Every `positions` message the page posted so far, by grouping, in order; still exactly these a frame later, so a late duplicate fails. */
  public async expectPostedGroupings(groupings: LayoutGrouping[]): Promise<void> {
    await expect.poll(async (): Promise<LayoutGrouping[]> => this.postedGroupings()).toEqual(groupings);
    await this.page.evaluate(ONE_FRAME);
    expect(await this.postedGroupings()).toEqual(groupings);
  }

  /** Boxes are drawn and every box's frame lies inside the canvas, none cut at its edge. */
  public async expectBoxesInsideCanvas(): Promise<void> {
    await this.expectBoxesAroundPackages();
    await expect.poll(async (): Promise<string[]> => this.clipFaults()).toEqual([]);
  }

  /** At least `count` boxes overlap the canvas, so a timing run draws boxes rather than empty space. */
  public async expectBoxesInView(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.boxesInView()).toBeGreaterThanOrEqual(count);
  }

  private async clipFaults(): Promise<string[]> {
    const canvas = await this.container.evaluate(readRect);
    const folders = await this.folders();

    return clipFaultsOf(canvas, folders);
  }

  private async boxesInView(): Promise<number> {
    const canvas = await this.container.evaluate(readRect);
    const folders = await this.folders();

    return inViewCountOf(canvas, folders);
  }

  private async isCanvasFitting(): Promise<boolean> {
    const container = await this.container.evaluate(readRect);
    const canvas = await this.container.locator('canvas').first().evaluate(readRect);
    const isSameHeight = Math.abs(container.height - canvas.height) <= CANVAS_TOLERANCE_PX;
    const isSameTop = Math.abs(container.top - canvas.top) <= CANVAS_TOLERANCE_PX;

    return isSameHeight && isSameTop;
  }

  private async savedGrouped(): Promise<boolean | null> {
    const raw = await this.page.evaluate((): unknown => window.__state);

    return readGraphViewState(raw)?.grouped ?? null;
  }

  private async savedCollapsed(): Promise<string[] | null> {
    const raw = await this.page.evaluate((): unknown => window.__state);

    return readGraphViewState(raw)?.collapsed ?? null;
  }

  private async groupedFact(): Promise<boolean | null> {
    return this.page.evaluate((): boolean | null => window.__tcGraphProbe?.grouped() ?? null);
  }

  private async postedGroupings(): Promise<LayoutGrouping[]> {
    const posted = await readPosted(this.page);

    return positionsPosted(posted).map(groupingOf);
  }

  private async lastPostedGrouping(): Promise<LayoutGrouping | undefined> {
    const groupings = await this.postedGroupings();

    return groupings.at(-1);
  }
}
