import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphFoldersPage } from './graph-folders.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphWidgetsPage } from './graph-widgets.po.ts';
import { BUNDLE_HEADING_TEXT } from '../../src/graph/common/details.const.ts';
import { DETAILS_LABEL, GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { explainLabelOf, folderEndLabelOf } from '../../src/graph/utils/details-text.util.ts';
import type { BundleViewFacts } from '../common/graph-folders.type.ts';
import type { LinkEnds } from '../common/playwright.type.ts';
import { readLineCounts } from '../test/utils/element-lines.spec.util.ts';
import { isInside, pointBoxOf, readRect } from '../test/utils/element-rect.spec.util.ts';
import { endCentreOf, linkPointOf } from '../test/utils/graph-folder-points.spec.util.ts';
import { isHitWithin } from '../test/utils/graph-widgets.spec.util.ts';

/** Half way from the source end to the target end: clear of both ends' nodes. */
const LINK_MIDPOINT = 0.5;

/** A tap on a folder link and the details panel's bundle view it opens. */
export class GraphBundle {
  private readonly container: Locator;
  private readonly count: Locator;
  private readonly explains: Locator;
  private readonly folders: GraphFoldersPage;
  private readonly heading: Locator;
  private readonly lead: Locator;
  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly rows: Locator;
  private readonly texts: Locator;
  private readonly view: Locator;
  private readonly widgets: GraphWidgetsPage;

  public constructor(page: Page) {
    const panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });

    this.page = page;
    this.folders = new GraphFoldersPage(page);
    this.probe = new GraphProbePage(page);
    this.widgets = new GraphWidgetsPage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.view = panel.locator('[data-view="bundle"]');
    this.heading = this.view.getByRole('heading', { level: 2 });
    this.lead = this.view.locator('.details-lead');
    this.count = this.view.locator('.details-muted');
    this.rows = this.view.locator('.details-list .details-item');
    this.explains = this.rows.locator('button.details-explain');
    this.texts = this.rows.locator('.details-link-text');
  }

  /** The centres of both link ends lie inside the container, so a tap between them can reach the canvas. */
  public async expectEndsInView(source: string, target: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.areEndsInView(source, target)).toBe(true);
  }

  /**
   * Taps the link between two ends half way from `source` to `target`, once the widget layer has settled, so a late
   * relayout cannot move the link under the click. A collapsed end is named by its folder key.
   */
  public async tapFolderLink(source: string, target: string): Promise<void> {
    await this.widgets.expectLayerSettledOn(this.container);

    const { from, to } = await this.endPointsOf(source, target);
    const point = linkPointOf(from, to, LINK_MIDPOINT);
    const isOnCanvas = await this.container.evaluate(isHitWithin, point);

    expect(isOnCanvas, `the tap point (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) lies on a widget, not on the canvas`).toBe(true);
    await this.page.mouse.click(point.x, point.y);
  }

  /** Presses the Explain button of the row for the link `source` to `target`. */
  public async pressExplain(source: string, target: string): Promise<void> {
    const name = explainLabelOf(source, target);

    await this.rows.getByRole('button', { name, exact: true }).click();
  }

  /** Presses the lead's end button of the collapsed folder `title`. */
  public async pressFolderEnd(title: string): Promise<void> {
    const name = folderEndLabelOf(title);

    await this.lead.getByRole('button', { name, exact: true }).click();
  }

  /** The bundle view's heading, lead, count line and link rows, in order; a row is read from its text span, not the `li`, which ends in `Explain`. */
  public async expectBundleView(facts: BundleViewFacts): Promise<void> {
    await expect(this.heading).toHaveText(BUNDLE_HEADING_TEXT);
    await expect(this.lead).toHaveText(facts.lead);
    await expect(this.count).toHaveText(facts.count);
    await expect(this.texts).toHaveText(facts.rows);
  }

  /** Every row's Explain label sits on one line, so a narrow panel shrinks the row's text, not the button. */
  public async expectExplainOnOneLine(rowCount: number): Promise<void> {
    await expect(this.explains).toHaveCount(rowCount);

    const lineCounts = await this.explains.evaluateAll(readLineCounts);

    expect(lineCounts, 'the lines each Explain label wraps to, per row').toEqual(Array<number>(rowCount).fill(1));
  }

  private async endPointsOf(source: string, target: string): Promise<LinkEnds> {
    const folders = await this.folders.folders();
    const nodes = await this.probe.nodes();
    const from = endCentreOf(source, folders, nodes);
    const to = endCentreOf(target, folders, nodes);
    const ends: LinkEnds = { from, to };

    return ends;
  }

  private async areEndsInView(source: string, target: string): Promise<boolean> {
    const container = await this.container.evaluate(readRect);
    const { from, to } = await this.endPointsOf(source, target);
    const boxes = [pointBoxOf(from), pointBoxOf(to)];

    return boxes.every((box): boolean => isInside(box, container));
  }
}
