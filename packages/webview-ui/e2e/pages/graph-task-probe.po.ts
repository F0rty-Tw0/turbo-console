import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import { ATOM_BOX_PREFIX } from '../../src/graph/common/graph-atom.const.ts';
import { PACKAGE_GLYPH } from '../../src/graph/common/graph-glyph.const.ts';
import type { ProbeTitle } from '../../src/graph/common/graph-probe-titles.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { SCRIPTS_BOX_PREFIX } from '../../src/graph/common/graph-task.const.ts';
import type { RunOutline } from '../common/graph.type.ts';
import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';
import { withoutSpaces } from '../test/utils/graph-theme.spec.util.ts';
import { readBoxTitles, unreadableTitlesOf } from '../test/utils/graph-title-crossings.spec.util.ts';
import { expectTitlesFit } from '../test/utils/graph-title-measure.spec.util.ts';

const BOX_PREFIX = 'pkg:';

const isBoxId = (id: string): boolean => id.startsWith(BOX_PREFIX);

const isAtomBoxId = (id: string): boolean => id.startsWith(ATOM_BOX_PREFIX);

const isScriptsBoxId = (id: string): boolean => id.startsWith(SCRIPTS_BOX_PREFIX);

const isTaskId = (id: string): boolean => !isBoxId(id) && !isAtomBoxId(id) && !isScriptsBoxId(id);

const isBox = (node: ProbeNode): boolean => isBoxId(node.id);

const GLYPH_PREFIX = `${PACKAGE_GLYPH} `;

/** A package box's title without the package glyph its label starts with when the page draws glyphs. */
const titleOf = (node: ProbeNode): string => {
  const isGlyphed = node.text.startsWith(GLYPH_PREFIX);

  if (!isGlyphed) return node.text;

  const title = node.text.slice(GLYPH_PREFIX.length);

  return title;
};

/** Page px a title's label may reach past its box, for rounding. */
const INSIDE_SLACK_PX = 1;

/** Whether `title`'s label lies inside its box, within `INSIDE_SLACK_PX`. */
const isLabelInside = (title: ProbeTitle): boolean => {
  const { label, box } = title;
  const isInsideAcross =
    label.left >= box.left - INSIDE_SLACK_PX && label.left + label.width <= box.left + box.width + INSIDE_SLACK_PX;
  const isInsideAlong = label.top >= box.top - INSIDE_SLACK_PX && label.top + label.height <= box.top + box.height + INSIDE_SLACK_PX;

  return isInsideAcross && isInsideAlong;
};

const titleIdOf = (title: ProbeTitle): string => title.id;

/** `outline` with its colour as the probe reports it, without spaces. */
const comparableOf = (outline: RunOutline | null): RunOutline | null => {
  if (outline === null) return null;

  const colour = withoutSpaces(outline.colour);
  const comparable: RunOutline = { width: outline.width, colour };

  return comparable;
};

/** The drawn task graph read through the probe: task node ids and the `pkg:` package compounds around them. */
export class GraphTaskProbe {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /** The probe's node ids without the `pkg:` compounds, sorted. */
  public async taskIds(): Promise<string[]> {
    const ids = await this.probe.nodeIds();

    return ids.filter(isTaskId);
  }

  public async expectTaskIds(ids: string[]): Promise<void> {
    const sorted = sortedNames(ids);

    await expect.poll(async (): Promise<string[]> => this.taskIds()).toEqual(sorted);
  }

  /** The text drawn on the task node `id` is `text`. */
  public async expectText(id: string, text: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.textOf(id)).toEqual(text);
  }

  /** The centre of each task node, by id. */
  public async taskPositions(): Promise<Positions> {
    const nodes = await this.probe.nodes();
    const tasks = nodes.filter((node) => isTaskId(node.id));
    const entries = tasks.map((node): [string, Position] => [node.id, { x: node.x, y: node.y }]);

    return Object.fromEntries(entries);
  }

  /** Every task node sits at `positions`. */
  public async expectTaskPositions(positions: Positions): Promise<void> {
    const now = await this.taskPositions();

    expect(now).toEqual(positions);
  }

  /** The `pkg:` compound ids, as `pkg:<package name>`. */
  public async expectBoxIds(ids: string[]): Promise<void> {
    const sorted = sortedNames(ids);

    await expect.poll(async (): Promise<string[]> => this.boxIds()).toEqual(sorted);
  }

  /**
   * The `pkg:` boxes are titled `names`, each title draws over any drawn line meeting its label, on its opaque backdrop,
   * and each label lies inside its box (spec §7: the label sits inside the frame).
   */
  public async expectBoxTitlesDrawn(names: string[]): Promise<void> {
    const sorted = sortedNames(names);

    await expect.poll(async (): Promise<string[]> => this.boxTitles()).toEqual(sorted);
    await expect.poll(async (): Promise<string[]> => this.unreadableTitleIds()).toEqual([]);
    await expect.poll(async (): Promise<string[]> => this.outsideTitleIds()).toEqual([]);
  }

  /** A box is drawn for each of `titles`, and each is as wide as its title and draws it whole (`expectTitlesFit`). */
  public async expectBoxTitlesUncut(titles: string[]): Promise<void> {
    const boxes = await this.boxes();
    const titled = boxes.filter((node) => titles.includes(titleOf(node)));
    const foundTitles = sortedNames(titled.map(titleOf));
    const wantedTitles = sortedNames(titles);

    expect(foundTitles).toEqual(wantedTitles);
    await expectTitlesFit(this.page, titled);
  }

  /** The task's outline is `outline` (its colour compared without spaces), or it has none for `null`. */
  public async expectRunOutline(id: string, outline: RunOutline | null): Promise<void> {
    const expected = comparableOf(outline);

    await expect.poll(async (): Promise<RunOutline | null> => this.outlineOf(id)).toEqual(expected);
  }

  private async textOf(id: string): Promise<string | null> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => candidate.id === id);

    return node?.text ?? null;
  }

  private async outlineOf(id: string): Promise<RunOutline | null> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => candidate.id === id);

    if (node === undefined || node.outlineWidth === 0) return null;

    const outline: RunOutline = { width: node.outlineWidth, colour: withoutSpaces(node.outlineColor) };

    return outline;
  }

  private async boxes(): Promise<ProbeNode[]> {
    const nodes = await this.probe.nodes();

    return nodes.filter(isBox);
  }

  private async boxTitles(): Promise<string[]> {
    const boxes = await this.boxes();
    const titles = boxes.map(titleOf);

    return titles.sort();
  }

  private async unreadableTitleIds(): Promise<string[]> {
    const titles = await readBoxTitles(this.page);
    const lines = await readEdgeLines(this.page);

    return unreadableTitlesOf(titles, lines);
  }

  private async outsideTitleIds(): Promise<string[]> {
    const titles = await readBoxTitles(this.page);
    const outside = titles.filter((title): boolean => !isLabelInside(title));

    return outside.map(titleIdOf);
  }

  private async boxIds(): Promise<string[]> {
    const ids = await this.probe.nodeIds();

    return ids.filter(isBoxId);
  }
}
