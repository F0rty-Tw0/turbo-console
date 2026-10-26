/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { CandidateKey } from '../../src/graph/common/details.type.ts';
import { DETAILS_LABEL, GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import type { TraceFacts } from '../common/graph.type.ts';
import { isInside, readRect } from '../test/utils/element-rect.spec.util.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { ghostProblemsOf, leftoverGhostOf } from '../test/utils/graph-ghost.spec.util.ts';
import { anchorBoxOf, isClearOf } from '../test/utils/graph-narrow.spec.util.ts';
import { expectTraceStep } from '../test/utils/graph-trace-step.spec.util.ts';

const PICKING_LEAD = 'Select the package to trace to, here or on the graph.';

const linksTextOf = (count: number): string => (count === 1 ? '1 link' : `${count} links`);

/** The picking and trace views of the details panel, the canvas hint over the graph, and the ghosts a trace draws. */
export class GraphDetailsTrace {
  public readonly container: Locator;
  public readonly filter: Locator;
  public readonly heading: Locator;
  public readonly hint: Locator;
  public readonly panel: Locator;
  public readonly steps: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
    this.filter = this.panel.getByRole('searchbox', { name: 'Filter packages', exact: true });
    this.heading = this.panel.getByRole('heading', { level: 2 });
    this.hint = page.locator('p.graph-hint');
    this.steps = this.panel.locator('ol').getByRole('listitem');
  }

  public async cancel(): Promise<void> {
    await this.buttonOf('Cancel').click();
  }

  public async clearTrace(): Promise<void> {
    await this.buttonOf('Clear trace').click();
  }

  public async swapEnds(): Promise<void> {
    await this.buttonOf('Swap ends').click();
  }

  public async show(name: string): Promise<void> {
    await this.buttonOf(`Show ${name}`).click();
  }

  public async focusCandidate(name: string): Promise<void> {
    await this.buttonOf(name).focus();
  }

  public async pickCandidate(name: string): Promise<void> {
    await this.buttonOf(name).click();
  }

  /** Types `text` after what the filter box holds, one key at a time. */
  public async filterCandidates(text: string): Promise<void> {
    await this.filter.pressSequentially(text);
  }

  public async clearFilter(): Promise<void> {
    await this.filter.fill('');
  }

  /** The title, the lead line, the filter box and Cancel. */
  public async expectPicking(start: string): Promise<void> {
    await expect(this.heading).toHaveText(`Trace from ${start}`);
    await expect(this.panel.getByText(PICKING_LEAD, { exact: true })).toBeVisible();
    await expect(this.filter).toBeVisible();
    await expect(this.buttonOf('Cancel')).toBeVisible();
  }

  /** The group's count is `total` (before the filter); its buttons are `names` in order; none left reads "None" or "No match". */
  public async expectCandidates(group: CandidateKey, names: string[], total: number): Promise<void> {
    const section = this.groupOf(group);
    const emptyText = total === 0 ? 'None' : 'No match';

    await this.expectCandidateCount(group, total);
    await expect(section.getByRole('button')).toHaveText(names);
    await expect(section.getByText(emptyText, { exact: true })).toBeVisible({ visible: names.length === 0 });
  }

  public async expectCandidateCount(group: CandidateKey, count: number): Promise<void> {
    const heading = this.groupOf(group).getByRole('heading', { level: 3 });

    await expect(heading).toHaveText(new RegExp(`\\(${count}\\)$`));
  }

  /** Each candidate button of a path group is described by its distance: "1 link", "3 links". */
  public async expectCandidateLinks(group: CandidateKey, links: number[]): Promise<void> {
    const buttons = this.groupOf(group).getByRole('button');

    for (const [index, count] of links.entries()) await expect(buttons.nth(index)).toHaveAccessibleDescription(linksTextOf(count));
  }

  public async expectFilterValue(text: string): Promise<void> {
    await expect(this.filter).toHaveValue(text);
  }

  /** The hint text, then `Esc` cancels, in a plain paragraph that is neither focusable nor live; `null` means no hint. */
  public async expectHint(text: string | null): Promise<void> {
    const count = text === null ? 0 : 1;

    await expect(this.hint).toHaveCount(count);

    if (text === null) return;

    await expect(this.hint).toHaveText(`${text} Esc cancels`);
    await expect(this.hint.locator('kbd')).toHaveText('Esc');
    await expect(this.hint).not.toHaveAttribute('tabindex', /.*/);
    await expect(this.hint).not.toHaveAttribute('aria-live', /.*/);
  }

  /** The hint draws the info icon after a link tap, the trace icon otherwise. */
  public async expectHintNudged(isNudged: boolean): Promise<void> {
    await expect(this.hint.locator('.codicon-info')).toHaveCount(isNudged ? 1 : 0);
    await expect(this.hint.locator('.codicon-git-commit')).toHaveCount(isNudged ? 0 : 1);
  }

  /** The title, the summary, the steps in order with "depends on" between, and Clear trace and Swap ends. */
  public async expectTrace(facts: TraceFacts): Promise<void> {
    const showable = facts.showable ?? facts.hidden;
    const links = this.panel.getByText('depends on', { exact: true });

    await expect(this.heading).toHaveText('Trace');
    await expect(this.panel.getByText(facts.summary, { exact: true })).toBeVisible();
    await expect(this.steps).toHaveCount(facts.path.length);
    await expect(links).toHaveCount(Math.max(facts.path.length - 1, 0));

    for (const [index, name] of facts.path.entries()) {
      await expectTraceStep(this.steps.nth(index), name, facts.hidden.includes(name), showable.includes(name));
    }

    await expect(this.buttonOf('Clear trace')).toBeVisible();
    await expect(this.buttonOf('Swap ends')).toBeVisible();
  }

  /** `name` is the one ghost: dashed, with dashed drawn path edges, and every other edge it touches undrawn. */
  public async expectGhost(name: string): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.ghostProblems(name)).toEqual([]);
  }

  /** The ghost's rendered box lies inside the graph container. */
  public async expectGhostOnCanvas(name: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isOnCanvas(name)).toBe(true);
  }

  /** No ghost node or edge, and every edge between visible packages drawn. */
  public async expectNoGhost(): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.leftovers()).toEqual([]);
  }

  /** The named nodes' rendered span ends left of the overlay with the keep-clear margin to spare. */
  public async expectAnchorsClear(names: string[]): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isClear(names)).toBe(true);
  }

  private async ghostProblems(name: string): Promise<string[]> {
    const nodes = await this.probe.nodes();
    const edges = await this.probe.edges();

    return ghostProblemsOf(nodes, edges, name);
  }

  private async leftovers(): Promise<string[]> {
    const nodes = await this.probe.nodes();
    const edges = await this.probe.edges();
    const visible = await this.page.evaluate((): string[] => window.__tcGraphProbe?.visibleIds() ?? []);

    return leftoverGhostOf(nodes, edges, visible);
  }

  private async isOnCanvas(name: string): Promise<boolean> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const container = await this.container.evaluate(readRect);
    const node = nodes.find((candidate): boolean => candidate.id === name);

    return node !== undefined && isInside(nodeBoxOf(node, zoom), container);
  }

  private async isClear(names: string[]): Promise<boolean> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const overlay = await this.panel.evaluate(readRect);
    const box = anchorBoxOf(nodes, names, zoom);

    return isClearOf(box, overlay.left);
  }

  private groupOf(group: CandidateKey): Locator {
    return this.panel.locator(`section[data-group="${group}"]`);
  }

  private buttonOf(name: string): Locator {
    return this.panel.getByRole('button', { name, exact: true });
  }
}
