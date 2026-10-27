import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { NODE_FONT_SIZE, SELECTED_BORDER_PX } from '../../src/graph/common/graph.const.ts';
import type { LabelFontInput } from '../common/graph-theme.type.ts';
import type { ColourInkInput } from '../common/graph.type.ts';
import type { ScreenClip } from '../common/playwright.type.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { labelWidthsOf } from '../test/utils/graph-label-font.spec.util.ts';
import { colourInkOf } from '../test/utils/graph-png.spec.util.ts';

/** How far inside a node's left border the fill patch starts, in screen px: clear of the border and of the label. */
const FILL_INSET_PX = 4;

/** The fill patch's side in screen px. */
const PATCH_PX = 3;

/** Per channel: tight, since Light Modern's selection fill `#e8e8e8` is 23 from its white editor background. */
const FILL_TOLERANCE = 4;

/** A `PATCH_PX` square `FILL_INSET_PX` inside the node's left border, at its vertical centre. */
const fillPatchOf = (node: ProbeNode, zoom: number): ScreenClip => {
  const box = nodeBoxOf(node, zoom);
  const x = Math.round(box.left + FILL_INSET_PX);
  const y = Math.round(node.renderedY - PATCH_PX / 2);
  const clip: ScreenClip = { x, y, width: PATCH_PX, height: PATCH_PX };

  return clip;
};

/** A selected node's fill, read from a screenshot, and the room a bold label has inside its selected border. */
export class GraphSelection {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /** Polls until every pixel of the fill patch inside node `id` is `colour`, within the ink tolerance. */
  public async expectFill(id: string, colour: string): Promise<void> {
    await expect.poll(async (): Promise<number> => this.fillInkOf(id, colour)).toBe(PATCH_PX * PATCH_PX);
  }

  /**
   * Each drawn package of `names` fits its label, measured bold, inside its width less both selected borders; every
   * slack in px is recorded as a test annotation, smallest first.
   */
  public async expectBoldLabelsFit(names: string[]): Promise<void> {
    await expect.poll(async (): Promise<number> => this.drawnCountOf(names)).toBe(names.length);

    const slacks = await this.boldSlacksOf(names);
    const entries = [...slacks];
    const bySlack = entries.sort((left, right): number => left[1] - right[1]);
    const overflowing = bySlack.filter(([, slack]): boolean => slack < 0);

    test.info().annotations.push({ type: 'bold-label-slack-px', description: JSON.stringify(bySlack) });
    expect(overflowing).toStrictEqual([]);
  }

  private async drawnOf(names: string[]): Promise<ProbeNode[]> {
    const nodes = await this.probe.nodes();

    return nodes.filter((node): boolean => names.includes(node.id));
  }

  private async drawnCountOf(names: string[]): Promise<number> {
    const drawn = await this.drawnOf(names);

    return drawn.length;
  }

  /** Per drawn package of `names`: its width less both selected borders less its label measured bold, in px to 0.01. */
  private async boldSlacksOf(names: string[]): Promise<Map<string, number>> {
    const nodes = await this.drawnOf(names);
    const texts = nodes.map((node): string => node.text);
    const input: LabelFontInput = { texts, font: `bold ${NODE_FONT_SIZE}px` };
    const widths = await this.page.evaluate(labelWidthsOf, input);
    const entryOf = (node: ProbeNode, index: number): [string, number] => {
      const room = node.width - 2 * SELECTED_BORDER_PX;
      const slack = room - (widths[index] ?? Infinity);

      return [node.id, Math.round(slack * 100) / 100];
    };
    const entries = nodes.map(entryOf);

    return new Map(entries);
  }

  private async fillInkOf(id: string, colour: string): Promise<number> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) return -1;

    const zoom = await this.probe.zoom();
    const clip = fillPatchOf(node, zoom);
    const shot = await this.page.screenshot({ clip });
    const input: ColourInkInput = { png: shot.toString('base64'), colour, tolerance: FILL_TOLERANCE };

    return this.page.evaluate(colourInkOf, input);
  }
}
