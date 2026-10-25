import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { FOLDER_PADDING_PX } from '../../src/graph/common/graph.const.ts';
import type { ColourInkInput, RunOutline } from '../common/graph.type.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';
import { colourInkOf } from '../test/utils/graph-png.spec.util.ts';
import { withoutSpaces } from '../test/utils/graph-theme.spec.util.ts';

const BOX_PREFIX = 'pkg:';

const isBoxId = (id: string): boolean => id.startsWith(BOX_PREFIX);

const isTaskId = (id: string): boolean => !isBoxId(id);

const isBox = (node: ProbeNode): boolean => isBoxId(node.id);

const textOf = (node: ProbeNode): string => node.text;

/** A page area in CSS pixels, as `page.screenshot` clips it. */
type ScreenClip = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Model px kept off the frame line above the band and off the run outline that reaches into it from below. */
const BAND_INSET = { top: 2, bottom: 6 } as const;

/** Half the width, in model px, of the band's middle strip, where a link from above enters the box. */
const CENTRE_HALF_PX = 8;

/** The band left of the middle strip, or the middle strip itself. */
type BandPart = 'left' | 'centre';

/**
 * Part of a box's top padding band at `zoom`, inside its content's sides; a box's width and height leave out its
 * padding.
 */
const titleBandOf = (box: ProbeNode, zoom: number, part: BandPart): ScreenClip => {
  const left = box.renderedX - (box.width / 2) * zoom;
  const centreLeft = box.renderedX - CENTRE_HALF_PX * zoom;
  const frameTop = box.renderedY - (box.height / 2 + FOLDER_PADDING_PX) * zoom;
  const y = frameTop + BAND_INSET.top * zoom;
  const height = (FOLDER_PADDING_PX - BAND_INSET.top - BAND_INSET.bottom) * zoom;

  if (part === 'centre') {
    const centre: ScreenClip = { x: centreLeft, y, width: 2 * CENTRE_HALF_PX * zoom, height };

    return centre;
  }

  const leftPart: ScreenClip = { x: left, y, width: centreLeft - left, height };

  return leftPart;
};

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
   * The `pkg:` boxes are titled `names`, and on the page each title is inked in its label colour in the left part of its
   * top padding band, none of it in the middle strip where a link from above enters.
   */
  public async expectBoxTitlesDrawn(names: string[]): Promise<void> {
    const sorted = sortedNames(names);
    const noInk = names.map((): number => 0);

    await expect.poll(async (): Promise<string[]> => this.boxTitles()).toEqual(sorted);
    await expect.poll(async (): Promise<number[]> => this.titleInks('centre')).toEqual(noInk);
    await expect.poll(async (): Promise<number[]> => this.titleInks('left')).not.toContain(0);
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
    const titles = boxes.map(textOf);

    return titles.sort();
  }

  /** Each box's title ink in `part` of its top band, one screenshot clip per box. */
  private async titleInks(part: BandPart): Promise<number[]> {
    const boxes = await this.boxes();
    const zoom = await this.probe.zoom();
    const inks: number[] = [];

    for (const box of boxes) {
      const clip = titleBandOf(box, zoom, part);

      inks.push(await this.titleInkOf(box, clip));
    }

    return inks;
  }

  private async titleInkOf(box: ProbeNode, clip: ScreenClip): Promise<number> {
    const shot = await this.page.screenshot({ clip });
    const input: ColourInkInput = { png: shot.toString('base64'), colour: box.label };

    return this.page.evaluate(colourInkOf, input);
  }

  private async boxIds(): Promise<string[]> {
    const ids = await this.probe.nodeIds();

    return ids.filter(isBoxId);
  }
}
