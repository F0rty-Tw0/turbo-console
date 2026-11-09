import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeRect, ProbeTitle } from '../../src/graph/common/graph-probe-titles.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { FOLDER_PADDING_PX } from '../../src/graph/common/graph.const.ts';
import { overlaps } from '../test/utils/element-rect.spec.util.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { readBoxTitles, titleCrossingsOf } from '../test/utils/graph-title-crossings.spec.util.ts';

/** How far, in model pixels, a framed box may be drawn from its ELK frame and its title from the placeholder (spec AC 2). */
const FRAME_TOLERANCE_PX = 4;

/** How far, in model pixels, one framed box may be drawn from its ELK frame: below a 2 px run outline's shift. */
const ON_FRAME_PX = 1;

/** The package box titles the probe lists, and the ones a drawn line crosses: how many, and their box ids. */
type TitleCrossings = {
  readonly titles: number;
  readonly crossed: number;
  readonly ids: string[];
};

/** Whether enough boxes are framed, and each framed box drawn further than the tolerance from its frame or placeholder. */
type FrameFit = {
  readonly isFramedEnough: boolean;
  readonly off: string[];
};

/** Where a box title sits against its box: inside it from the top, and no lower than the box's top padding band. */
type TitleBand = {
  readonly isBelowTop: boolean;
  readonly isInTopBand: boolean;
};

const isFramed = (title: ProbeTitle): boolean => title.isFramed;

/** The largest gap between a side of `rect` and the same side of `other`. */
const sideGapOf = (rect: ProbeRect, other: ProbeRect): number => {
  const gaps = [
    rect.left - other.left,
    rect.top - other.top,
    rect.left + rect.width - (other.left + other.width),
    rect.top + rect.height - (other.top + other.height)
  ];
  const sizes = gaps.map(Math.abs);

  return Math.max(...sizes);
};

/** Whether a framed title is drawn within the tolerance of its frame and of its placeholder. */
const isTrue = (title: ProbeTitle): boolean => {
  const frameError = title.frameError ?? Infinity;
  const titleError = title.titleError ?? Infinity;

  return frameError <= FRAME_TOLERANCE_PX && titleError <= FRAME_TOLERANCE_PX;
};

/** A framed title off its frame or placeholder, named with both errors so a failure says by how much. */
const offTextOf = (title: ProbeTitle): string => `${title.id} frame ${title.frameError} title ${title.titleError}`;

/** The task mode package box titles the page draws, against the lines it draws. */
export class GraphBoxTitles {
  private readonly page: Page;

  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /**
   * The probe lists `titles` package box titles and no drawn line meets the label box of any; a failure lists how many
   * titles are crossed and their ids. The count keeps an empty list (no probe, renamed box class) from passing.
   */
  public async expectNoTitleCrossed(titles: number): Promise<void> {
    const none: TitleCrossings = { titles, crossed: 0, ids: [] };

    await expect.poll(async (): Promise<TitleCrossings> => this.crossings()).toStrictEqual(none);
  }

  /**
   * Every framed box is drawn within 4 px of its ELK frame and its title within 4 px of its placeholder; with
   * `mustFrame`, at least one box is framed, so a view whose titled-row boxes lost their frames fails.
   */
  public async expectFramesTrue(mustFrame: boolean): Promise<void> {
    const fit: FrameFit = { isFramedEnough: true, off: [] };

    await expect.poll(async (): Promise<FrameFit> => this.frameFit(mustFrame)).toStrictEqual(fit);
  }

  /** The probe's reading of the package box `id` and its title; fails the test when it is not listed. */
  public async titleOf(id: string): Promise<ProbeTitle> {
    const titles = await readBoxTitles(this.page);
    const title = titles.find((candidate) => candidate.id === id);

    if (title === undefined) throw new Error(`no box title ${id} is probed`);

    return title;
  }

  /** The box `id` is drawn on its ELK frame when `isFrameWanted`, or from its children when not. */
  public async expectFramed(id: string, isFrameWanted: boolean): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isTitleFramed(id)).toBe(isFrameWanted);
  }

  /** The title of `id` starts at or below its box's top and ends inside its 32 px top padding band. */
  public async expectTitleInTopBand(id: string): Promise<void> {
    const band: TitleBand = { isBelowTop: true, isInTopBand: true };

    await expect.poll(async (): Promise<TitleBand> => this.titleBandOf(id)).toStrictEqual(band);
  }

  /** The title of `id` meets the box of no drawn node but its own box; a failure lists the ids it meets. */
  public async expectTitleClearOfNodes(id: string): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.nodesUnderTitle(id)).toEqual([]);
  }

  /** No drawn line meets the title of `id`. */
  public async expectTitleUncrossed(id: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isTitleCrossed(id)).toBe(false);
  }

  /** The box `id`, in model pixels, has each side within 4 px of the same side of `modelBox`. */
  public async expectModelBoxNear(id: string, modelBox: ProbeRect): Promise<void> {
    const gap = expect.poll(async (): Promise<number> => this.modelBoxGapOf(id, modelBox));

    await gap.toBeLessThanOrEqual(FRAME_TOLERANCE_PX);
  }

  /** The framed box `id` is drawn within 1 px of each side of its ELK frame. */
  public async expectOnFrame(id: string): Promise<void> {
    await expect.poll(async (): Promise<number> => this.frameErrorOf(id)).toBeLessThanOrEqual(ON_FRAME_PX);
  }

  private async frameErrorOf(id: string): Promise<number> {
    const title = await this.titleOf(id);

    return title.frameError ?? Infinity;
  }

  private async isTitleFramed(id: string): Promise<boolean> {
    const title = await this.titleOf(id);

    return title.isFramed;
  }

  private async modelBoxGapOf(id: string, modelBox: ProbeRect): Promise<number> {
    const title = await this.titleOf(id);

    return sideGapOf(title.modelBox, modelBox);
  }

  private async titleBandOf(id: string): Promise<TitleBand> {
    const { label, box } = await this.titleOf(id);
    const zoom = await this.probe.zoom();
    const bandBottom = box.top + FOLDER_PADDING_PX * zoom;
    const band: TitleBand = { isBelowTop: label.top >= box.top, isInTopBand: label.top + label.height <= bandBottom };

    return band;
  }

  private async nodesUnderTitle(id: string): Promise<string[]> {
    const { label } = await this.titleOf(id);
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const isUnder = (node: ProbeNode): boolean => node.id !== id && overlaps(label, nodeBoxOf(node, zoom));

    return nodes.filter(isUnder).map((node): string => node.id);
  }

  private async isTitleCrossed(id: string): Promise<boolean> {
    const title = await this.titleOf(id);
    const lines = await readEdgeLines(this.page);
    const crossed = titleCrossingsOf([title], lines);

    return crossed.length > 0;
  }

  private async crossings(): Promise<TitleCrossings> {
    const titles = await readBoxTitles(this.page);
    const ids = titleCrossingsOf(titles, await readEdgeLines(this.page));
    const crossings: TitleCrossings = { titles: titles.length, crossed: ids.length, ids };

    return crossings;
  }

  private async frameFit(mustFrame: boolean): Promise<FrameFit> {
    const titles = await readBoxTitles(this.page);
    const framed = titles.filter(isFramed);
    const isFramedEnough = framed.length > 0 || !mustFrame;
    const offTitles = framed.filter((title): boolean => !isTrue(title));
    const fit: FrameFit = { isFramedEnough, off: offTitles.map(offTextOf) };

    return fit;
  }
}
