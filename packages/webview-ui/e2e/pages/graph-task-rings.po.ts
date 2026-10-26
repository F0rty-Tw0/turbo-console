import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { ColourInkInput } from '../common/graph.type.ts';
import type { ScreenClip } from '../common/playwright.type.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { colourInkOf } from '../test/utils/graph-png.spec.util.ts';

/** Screen px kept around a node, so its outline and border are inside the shot. */
const RING_MARGIN_PX = 4;

/** The ring colour a shot of a node must show and the one it must not. */
type RingColours = {
  readonly drawn: string;
  readonly absent: string;
};

/** The node's box at `zoom`, grown by the ring margin on every side. */
const clipOf = (node: ProbeNode, zoom: number): ScreenClip => {
  const box = nodeBoxOf(node, zoom);
  const width = box.width + 2 * RING_MARGIN_PX;
  const height = box.height + 2 * RING_MARGIN_PX;
  const clip: ScreenClip = { x: box.left - RING_MARGIN_PX, y: box.top - RING_MARGIN_PX, width, height };

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
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) return [false, -1];

    const zoom = await this.probe.zoom();
    const clip = clipOf(node, zoom);
    const shot = await this.page.screenshot({ clip });
    const png = shot.toString('base64');
    const drawn: ColourInkInput = { png, colour: colours.drawn };
    const absent: ColourInkInput = { png, colour: colours.absent };
    const drawnInk = await this.page.evaluate(colourInkOf, drawn);
    const absentInk = await this.page.evaluate(colourInkOf, absent);

    return [drawnInk > 0, absentInk];
  }
}
