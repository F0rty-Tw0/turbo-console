import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ManifestEntry } from '../../src/bridge/common/graph-message.type.ts';
import type { ExcerptRow } from '../../src/graph/common/details.type.ts';
import { DETAILS_LABEL, DOUBLE_TAP_MS } from '../../src/graph/common/graph.const.ts';
import { expectExcerptRow } from '../test/utils/graph-excerpt.spec.util.ts';
import { edgeMidpointOf } from '../test/utils/graph-geometry.spec.util.ts';

/** The link view: tapping a link, its two ends, and the explain block with its excerpts and Open buttons. */
export class GraphDetailsLink {
  public readonly entries: Locator;
  public readonly explain: Locator;
  public readonly panel: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
    this.explain = this.panel.locator('section[aria-live]');
    this.entries = this.explain.getByRole('listitem');
  }

  /** Clicks the middle of the link between the two rendered centres once the nodes are drawn. */
  public async tapLink(source: string, target: string): Promise<void> {
    await this.probe.waitForNodes();

    const nodes = await this.probe.nodes();
    const middle = edgeMidpointOf(nodes, source, target);

    await this.page.mouse.click(middle.x, middle.y);
  }

  /**
   * Clicks the link's middle, then its target node once or twice, all inside the double-tap window; throws when the
   * clicks took longer, since the case would then pass without testing anything.
   */
  public async tapLinkThenTarget(source: string, target: string, clickCount: 1 | 2): Promise<void> {
    await this.probe.waitForNodes();

    const nodes = await this.probe.nodes();
    const middle = edgeMidpointOf(nodes, source, target);
    const end = nodes.find((node): boolean => node.id === target);

    if (end === undefined) throw new Error(`graph e2e: no node ${target} is drawn`);

    const startedAt = Date.now();

    await this.page.mouse.click(middle.x, middle.y);
    await this.page.mouse.click(end.renderedX, end.renderedY, { clickCount });

    const endedAt = Date.now();
    const tookMs = endedAt - startedAt;

    if (tookMs >= DOUBLE_TAP_MS) throw new Error(`graph e2e: the clicks took ${tookMs} ms, outside the double-tap window`);
  }

  public async pressEnd(name: string): Promise<void> {
    await this.panel.getByRole('button', { name, exact: true }).click();
  }

  public async focusOpen(field: string, key: string): Promise<void> {
    await this.openButton(field, key).focus();
  }

  public async pressOpen(field: string, key: string): Promise<void> {
    await this.openButton(field, key).click();
  }

  public async pressOpenMissing(): Promise<void> {
    await this.explain.getByRole('button', { name: 'Open package.json', exact: true }).click();
  }

  /** The title and lead name the link dependent first, and both ends are buttons. */
  public async expectLink(source: string, target: string): Promise<void> {
    const ends = this.panel.getByRole('button', { name: new RegExp(`^(${source}|${target})$`) });

    await expect(this.panel.getByRole('heading', { level: 2 })).toHaveText(`${source} → ${target}`);
    await expect(this.panel.getByText(`${source} depends on ${target}.`, { exact: true })).toBeVisible();
    await expect(ends).toHaveText([source, target]);
  }

  public async expectReading(file: string): Promise<void> {
    await expect(this.explain.getByText(`Reading ${file}…`, { exact: true })).toBeVisible();
  }

  /** One list item per entry, each with its "<field>, line <n>" label and its Open button. */
  public async expectEntries(entries: ManifestEntry[]): Promise<void> {
    await expect(this.entries).toHaveCount(entries.length);

    for (const entry of entries) await this.expectEntry(entry);
  }

  /** The entry's excerpt rows in order: a line-number cell, a text cell (raw, so inner spaces count), and the marked row. */
  public async expectExcerpt(field: string, key: string, rows: ExcerptRow[]): Promise<void> {
    const item = this.entries.filter({ has: this.page.getByRole('button', { name: `(${field}: ${key})` }) });
    const lines = item.locator('div > div');

    await expect(lines).toHaveCount(rows.length);

    for (const [index, row] of rows.entries()) await expectExcerptRow(lines.nth(index), row);
  }

  /** The info icon, "No entry", the line naming the target, and the Open package.json button. */
  public async expectMissing(file: string, target: string): Promise<void> {
    await this.expectStatus('No entry', 'info');
    await expect(this.explain.getByText(`${file} has no entry naming ${target}.`, { exact: true })).toBeVisible();
    await expect(this.explain.getByRole('button', { name: 'Open package.json', exact: true })).toBeVisible();
  }

  /** The warning icon, "Unreadable" and the line naming the file. */
  public async expectUnreadable(file: string): Promise<void> {
    await this.expectStatus('Unreadable', 'warning');
    await expect(this.explain.getByText(`Couldn't read ${file}.`, { exact: true })).toBeVisible();
  }

  public async expectNoOpenButton(): Promise<void> {
    await expect(this.explain.getByRole('button')).toHaveCount(0);
  }

  public async expectOpenFocused(field: string, key: string): Promise<void> {
    await expect(this.openButton(field, key)).toBeFocused();
  }

  /** Status is an icon and a word: neither the explain block nor its status line draws a side border. */
  public async expectNoSideBorder(word: string): Promise<void> {
    const status = this.explain.getByText(word, { exact: true }).locator('..');

    await expect(status).toHaveCSS('border-left-width', '0px');
    await expect(this.explain).toHaveCSS('border-left-width', '0px');
  }

  private async expectEntry(entry: ManifestEntry): Promise<void> {
    const line = entry.line + 1;
    const name = `Open package.json at line ${line} (${entry.field}: ${entry.key})`;

    await expect(this.explain.getByText(`${entry.field}, line ${line}`, { exact: true })).toBeVisible();
    await expect(this.openButton(entry.field, entry.key)).toHaveAccessibleName(name);
    await expect(this.openButton(entry.field, entry.key)).toHaveText(`Open at line ${line}`);
  }

  private async expectStatus(word: string, icon: 'info' | 'warning'): Promise<void> {
    const status = this.explain.getByText(word, { exact: true }).locator('..');

    await expect(status.locator('span').first()).toHaveClass(new RegExp(`codicon-${icon}`));
  }

  private openButton(field: string, key: string): Locator {
    return this.explain.getByRole('button', { name: `(${field}: ${key})` });
  }
}
