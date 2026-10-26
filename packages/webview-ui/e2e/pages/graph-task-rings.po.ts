import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { ColourInkInput } from '../common/graph.type.ts';
import { colourInkOf } from '../test/utils/graph-png.spec.util.ts';

/** Screen px kept around a node, so its outline and border are inside the shot. */
const RING_MARGIN_PX = 4;

/** A page area in CSS pixels, as `page.screenshot` clips it. */
type ScreenClip = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** The ring colour a shot of a node must show and the one it must not. */
type RingColours = {
  readonly drawn: string;
  readonly absent: string;
};

const clipOf = (node: ProbeNode, zoom: number): ScreenClip => {
  const width = node.width * zoom + 2 * RING_MARGIN_PX;
  const height = node.height * zoom + 2 * RING_MARGIN_PX;
  const clip: ScreenClip = { x: node.renderedX - width / 2, y: node.renderedY - height / 2, width, height };

  return clip;
};

/** The rings drawn around a task node, read from a screenshot of it. */
export class GraphTaskRings {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /** The shot of task `id` holds pixels of `colours.drawn` and none of `colours.absent`. */
  public async expectRings(id: string, colours: RingColours): Promise<void> {
    await expect.poll(async (): Promise<[boolean, number]> => this.ringsOf(id, colours)).toStrictEqual([true, 0]);
  }

  /** Whether `colours.drawn` shows at all, and how many pixels `colours.absent` has. */
  private async ringsOf(id: string, colours: RingColours): Promise<[boolean, number]> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => candidate.id === id);

    if (node === undefined) return [false, -1];

    const zoom = await this.probe.zoom();
    const shot = await this.page.screenshot({ clip: clipOf(node, zoom) });
    const png = shot.toString('base64');
    const drawn: ColourInkInput = { png, colour: colours.drawn };
    const absent: ColourInkInput = { png, colour: colours.absent };
    const drawnInk = await this.page.evaluate(colourInkOf, drawn);
    const absentInk = await this.page.evaluate(colourInkOf, absent);

    return [drawnInk > 0, absentInk];
  }
}
