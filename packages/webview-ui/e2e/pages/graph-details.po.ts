/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { DETAILS_LABEL, GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import type { Inspection } from '../../src/graph/common/inspection.type.ts';
import type { NeighbourGroup, PackageFacts, WidthChange } from '../common/graph.type.ts';
import { EMPTY_LEAD_STUB, GUIDE_FOOTER_STUB, GUIDE_KEYS_STUB, GUIDE_STUB } from '../test/stubs/graph-details-guide.stub.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { disabledMarksOf, toggleDetailsMeasured } from '../test/utils/graph-details.spec.util.ts';
import { expectGuideLine } from '../test/utils/graph-guide.spec.util.ts';

const NO_TAGS = 'No tags';

const NOT_AN_EXPLAIN = /^(?!Explain )/;

const OPEN_DETAILS = /^View Package Details/;

/** The details panel: its toolbar toggle, the empty guide and the package view with its actions and neighbour lists. */
export class GraphDetailsPage {
  public readonly canvas: Locator;
  public readonly heading: Locator;
  public readonly openButton: Locator;
  public readonly panel: Locator;
  public readonly toggleButton: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true, includeHidden: true });
    this.heading = this.panel.getByRole('heading', { level: 2 });
    this.openButton = this.panel.getByRole('button', { name: OPEN_DETAILS });
    this.toggleButton = page.getByRole('button', { name: DETAILS_LABEL, exact: true });
    this.canvas = page.getByRole('application', { name: GRAPH_LABEL }).locator('canvas').first();
  }

  public async toggle(): Promise<void> {
    await this.toggleButton.click();
  }

  /** Presses the Details toggle inside one task and returns the canvas width read just before and just after. */
  public async toggleDetailsInOneTask(): Promise<WidthChange> {
    return this.canvas.evaluate(toggleDetailsMeasured);
  }

  public async openPackageDetails(): Promise<void> {
    await this.openButton.click();
  }

  public async focus(): Promise<void> {
    await this.buttonOf('Focus').click();
  }

  public async clearFocus(): Promise<void> {
    await this.buttonOf('Clear focus').click();
  }

  /** Forced: an `aria-disabled` button still receives a real click. */
  public async exclude(): Promise<void> {
    await this.buttonOf('Exclude').click({ force: true });
  }

  public async startTrace(): Promise<void> {
    await this.buttonOf('Start trace').click();
  }

  /** Forced; any name button in the panel: a neighbour, a link end, a trace step. */
  public async pressNeighbour(name: string): Promise<void> {
    await this.buttonOf(name).click({ force: true });
  }

  /** Forced; the button named "Explain <source> → <target>". */
  public async explain(source: string, target: string): Promise<void> {
    await this.buttonOf(`Explain ${source} → ${target}`).click({ force: true });
  }

  /** Moves keyboard focus to the panel's button without pressing it. */
  public async focusButton(label: string): Promise<void> {
    await this.buttonOf(label).focus();
  }

  public async expectOpen(isOpen: boolean): Promise<void> {
    await expect(this.panel).toBeVisible({ visible: isOpen });
  }

  public async expectExpanded(isExpanded: boolean): Promise<void> {
    await expect(this.toggleButton).toHaveAttribute('aria-expanded', String(isExpanded));
  }

  /** The three ways in, each with its icon and copy, and the Esc line, whose `Enter` and `Esc` are `kbd`. */
  public async expectGuide(): Promise<void> {
    const items = this.panel.getByRole('listitem');

    await this.expectEmpty();
    await expect(items).toHaveCount(GUIDE_STUB.length);

    for (const [index, line] of GUIDE_STUB.entries()) await expectGuideLine(items.nth(index), line);

    await expect(this.panel.locator('section > p').last()).toHaveText(GUIDE_FOOTER_STUB);
    await expect(this.panel.locator('kbd')).toHaveText(GUIDE_KEYS_STUB);
  }

  public async expectEmpty(): Promise<void> {
    await this.expectHeading(DETAILS_LABEL);
    await expect(this.panel.locator('section > p').first()).toHaveText(EMPTY_LEAD_STUB);
  }

  /** The panel's border box is `px` wide, within half a pixel. */
  public async expectPanelWidth(px: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.panelWidth()).toBeCloseTo(px, 0);
  }

  public async expectHeading(text: string): Promise<void> {
    await expect(this.heading).toHaveText(text);
  }

  public async expectHeadingFocused(): Promise<void> {
    await expect(this.heading).toBeFocused();
  }

  /** The path (or "(root)"), the tags (or "No tags") and the Package Details button, whose label ends in the task count. */
  public async expectFacts(facts: PackageFacts): Promise<void> {
    const tagList = this.panel.getByRole('list', { name: 'Tags', exact: true });
    const noTags = this.panel.getByText(NO_TAGS, { exact: true });
    const hasTags = facts.tags.length > 0;
    const tagListCount = hasTags ? 1 : 0;
    const noTagsCount = hasTags ? 0 : 1;

    await expect(this.panel.getByText(facts.path, { exact: true })).toBeVisible();
    await expect(this.buttonOf(facts.button)).toBeVisible();
    await expect(tagList).toHaveCount(tagListCount);
    await expect(noTags).toHaveCount(noTagsCount);

    if (hasTags) await expect(tagList.getByRole('listitem')).toHaveText(facts.tags);
  }

  /** The package Focus button reads `label` and draws its icon: `target` for Focus, `close` for Clear focus. */
  public async expectFocusLabel(label: 'Focus' | 'Clear focus'): Promise<void> {
    const other = label === 'Focus' ? 'Clear focus' : 'Focus';
    const icon = label === 'Focus' ? /codicon-target/ : /codicon-close/;

    await expect(this.buttonOf(label)).toBeVisible();
    await expect(this.buttonOf(other)).toHaveCount(0);
    await expect(this.buttonOf(label).locator('.codicon')).toHaveClass(icon);
  }

  public async expectExcludeDisabled(isDisabled: boolean): Promise<void> {
    const expected = isDisabled ? 'true' : null;
    const exclude = this.buttonOf('Exclude');

    await expect.poll(async (): Promise<string | null> => exclude.getAttribute('aria-disabled')).toBe(expected);
  }

  /** The heading counts the names and the names read in list order. */
  public async expectNeighbours(group: NeighbourGroup, names: string[]): Promise<void> {
    const section = this.sectionOf(group);

    await expect(section.getByRole('heading', { level: 3 })).toHaveText(`${group} (${names.length})`);
    await expect(section.getByRole('button', { name: NOT_AN_EXPLAIN })).toHaveText(names);
  }

  /** The heading reads "(0)" and the list is the line "None". */
  public async expectNoNeighbours(group: NeighbourGroup): Promise<void> {
    const section = this.sectionOf(group);

    await expect(section.getByRole('heading', { level: 3 })).toHaveText(`${group} (0)`);
    await expect(section.getByText('None', { exact: true })).toBeVisible();
    await expect(section.getByRole('listitem')).toHaveCount(0);
  }

  public async expectNeighbourCount(group: NeighbourGroup, count: number): Promise<void> {
    const section = this.sectionOf(group);

    await expect(section.getByRole('heading', { level: 3 })).toHaveText(`${group} (${count})`);
    await expect(section.getByRole('listitem')).toHaveCount(count);
  }

  /** A hidden neighbour reads "hidden" and both its buttons are `aria-disabled`; a shown one reads and does neither. */
  public async expectNeighbourHidden(name: string, isHidden: boolean): Promise<void> {
    const pick = this.page.getByRole('button', { name, exact: true });
    const item = this.panel.getByRole('listitem').filter({ has: pick });
    const expected = isHidden ? 'true' : null;
    const marks = item.getByRole('button');

    await expect(item.getByText('hidden', { exact: true })).toBeVisible({ visible: isHidden });
    await expect.poll(async (): Promise<(string | null)[]> => marks.evaluateAll(disabledMarksOf)).toEqual([expected, expected]);
  }

  /** Polled on the probe's `inspection()`: what the page is showing details of. */
  public async expectInspection(inspection: Inspection): Promise<void> {
    await expect.poll(async (): Promise<Inspection | undefined> => this.inspection()).toEqual(inspection);
  }

  private async panelWidth(): Promise<number> {
    const rect = await this.panel.evaluate(readRect);

    return rect.width;
  }

  private async inspection(): Promise<Inspection | undefined> {
    return this.page.evaluate((): Inspection | undefined => window.__tcGraphProbe?.inspection());
  }

  private buttonOf(name: string): Locator {
    return this.panel.getByRole('button', { name, exact: true });
  }

  /** The neighbour list under a heading: the innermost `section` that holds it. */
  private sectionOf(group: NeighbourGroup): Locator {
    const heading = this.page.getByRole('heading', { level: 3, name: new RegExp(`^${group}`) });

    return this.panel.locator('section').filter({ has: heading }).last();
  }
}
