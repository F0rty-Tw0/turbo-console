import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ColourInkInput } from '../common/graph.type.ts';
import type { ElementRect, ScreenClip } from '../common/playwright.type.ts';
import { boxRectOf, findFolder } from '../test/utils/graph-folders.spec.util.ts';
import { readFolders } from '../test/utils/graph-foreign-boxes.spec.util.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { colourInkOf } from '../test/utils/graph-png.spec.util.ts';

/** Screen px kept around a node, so its outline and border are inside the shot. */
const RING_MARGIN_PX = 4;

/** The ring colour a shot of a node must show and the one it must not. */
type RingColours = {
  readonly drawn: string;
  readonly absent: string;
};

/** `box` grown by the ring margin on every side. */
const grownClipOf = (box: ElementRect): ScreenClip => {
  const width = box.width + 2 * RING_MARGIN_PX;
  const height = box.height + 2 * RING_MARGIN_PX;
  const clip: ScreenClip = { x: box.left - RING_MARGIN_PX, y: box.top - RING_MARGIN_PX, width, height };

  return clip;
};

/** The rings drawn around a task node, a package node or a collapsed folder, read from a screenshot of it. */
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

  /** The shot of the collapsed folder `folder` holds pixels of `colours.drawn` and none of `colours.absent`. */
  public async expectFolderRings(folder: string, colours: RingColours): Promise<void> {
    await expect.poll(async (): Promise<[boolean, number]> => this.folderRingsOf(folder, colours)).toStrictEqual([true, 0]);
  }

  /** Whether `colours.drawn` shows at all, and how many pixels `colours.absent` has. */
  private async ringsOf(id: string, colours: RingColours): Promise<[boolean, number]> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) return [false, -1];

    const zoom = await this.probe.zoom();
    const clip = grownClipOf(nodeBoxOf(node, zoom));

    return this.inkOf(clip, colours);
  }

  /** `ringsOf` for a folder's box, whose rendered rect is already in page pixels. */
  private async folderRingsOf(folder: string, colours: RingColours): Promise<[boolean, number]> {
    const folders = await readFolders(this.page);
    const found = findFolder(folders, folder);

    if (found === undefined) return [false, -1];

    const clip = grownClipOf(boxRectOf(found));

    return this.inkOf(clip, colours);
  }

  private async inkOf(clip: ScreenClip, colours: RingColours): Promise<[boolean, number]> {
    const shot = await this.page.screenshot({ clip });
    const png = shot.toString('base64');
    const drawn: ColourInkInput = { png, colour: colours.drawn };
    const absent: ColourInkInput = { png, colour: colours.absent };
    const drawnInk = await this.page.evaluate(colourInkOf, drawn);
    const absentInk = await this.page.evaluate(colourInkOf, absent);

    return [drawnInk > 0, absentInk];
  }
}
