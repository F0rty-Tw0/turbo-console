/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeRect } from '../../src/graph/common/graph-probe-titles.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { isInside, readRect, readRects, unionOf } from '../test/utils/element-rect.spec.util.ts';
import { chipRowMarginsOf } from '../test/utils/graph-atom-chips.spec.util.ts';
import { nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';

/** How far, in page px, the row or its chips may poke out of the umbrella (spec AC3): its left edge and width match the body exactly. */
const INSIDE_TOLERANCE_PX = 1;

/** One wheel notch; a positive `deltaY` zooms out. */
const WHEEL_NOTCH_PX = 100;

/** Runs in the page: whether the chip's first child node is its glyph span, which `prepend(glyph)` makes and `append(glyph)` does not. */
const isGlyphFirst = (chip: HTMLElement): boolean => {
  const { firstChild } = chip;

  return firstChild instanceof HTMLElement && firstChild.classList.contains('atom-chip-glyph');
};

/** Runs in the page: the label `id` draws while an export is on, `null` when the page has no probe. */
const exportLabelIn = (id: string): string | null => window.__tcGraphProbe?.exportLabel(id) ?? null;

/** The chip row over each drawn umbrella in the widgets layer, and the label the umbrella draws while it is exported. */
export class GraphAtomChips {
  private readonly page: Page;
  private readonly canvas: GraphCanvas;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.canvas = new GraphCanvas(page);
    this.probe = new GraphProbePage(page);
  }

  /** The text of each chip in the row of `umbrellaId`, in order; `[]` while it has no row. */
  public async texts(umbrellaId: string): Promise<string[]> {
    return this.rowOf(umbrellaId).locator('.atom-chip').allTextContents();
  }

  /** The row of `umbrellaId` shows exactly `texts`, in order. */
  public async expectTexts(umbrellaId: string, texts: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.texts(umbrellaId)).toEqual(texts);
  }

  /** No row is in the DOM for `umbrellaId`. */
  public async expectNoRow(umbrellaId: string): Promise<void> {
    await expect(this.rowOf(umbrellaId)).toHaveCount(0);
  }

  /** Each outlined chip of `umbrellaId` (cached, failed) leads with its glyph span, and the files chip has none. */
  public async expectGlyphsLeadOutlinedChips(umbrellaId: string): Promise<void> {
    const row = this.rowOf(umbrellaId);
    const outlined = row.locator('.atom-chip-cached, .atom-chip-failed');
    const count = await outlined.count();

    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const isFirst = await outlined.nth(index).evaluate(isGlyphFirst);

      expect(isFirst).toBe(true);
    }

    await expect(row.locator('.atom-chip-files .atom-chip-glyph')).toHaveCount(0);
  }

  /** The row of `umbrellaId` as a box in page CSS pixels. */
  public async rectOf(umbrellaId: string): Promise<ProbeRect> {
    const box = await this.rowOf(umbrellaId).boundingBox();

    if (box === null) throw new Error(`no chip row is drawn for ${umbrellaId}`);

    const rect: ProbeRect = { left: box.x, top: box.y, width: box.width, height: box.height };

    return rect;
  }

  /**
   * The umbrella is wholly in view, and its row and the union of its chips lie inside its rendered box within
   * `INSIDE_TOLERANCE_PX`, their tops at or below the umbrella's centre; polled, since the row follows one render behind.
   * The row's margins are kept as a test annotation.
   */
  public async expectInsideUmbrella(umbrellaId: string): Promise<void> {
    const inView = `${umbrellaId} lies wholly inside the canvas`;
    const inside = `the chip row and its chips lie inside ${umbrellaId}`;
    const isInView = async (): Promise<boolean> => this.isUmbrellaInView(umbrellaId);
    const worstMargin = async (): Promise<number> => this.worstMarginOf(umbrellaId);

    await expect.poll(isInView, { message: inView }).toBe(true);
    await expect.poll(worstMargin, { message: inside }).toBeGreaterThanOrEqual(-INSIDE_TOLERANCE_PX);

    const row = await this.rectOf(umbrellaId);
    const box = await this.umbrellaBoxOf(umbrellaId);
    const margins = chipRowMarginsOf(row, box);

    test.info().annotations.push({ type: 'chip-row-margins-px', description: JSON.stringify(margins) });
  }

  /** The row of `umbrellaId` has moved off `before` and lies inside the umbrella again. */
  public async expectFollowsAfter(umbrellaId: string, before: ProbeRect): Promise<void> {
    const hasMoved = async (): Promise<boolean> => {
      const now = await this.rectOf(umbrellaId);

      return now.left !== before.left || now.top !== before.top;
    };

    await expect.poll(hasMoved, { message: `the chip row of ${umbrellaId} moved` }).toBe(true);
    await this.expectInsideUmbrella(umbrellaId);
  }

  /** Clicks the centre of the row with the mouse: the row lets pointer events through, so the click reaches the canvas. */
  public async tapRowCentre(umbrellaId: string): Promise<void> {
    const centre = await this.rowCentreOf(umbrellaId);

    await this.page.mouse.click(centre.x, centre.y);
  }

  /** Double clicks the centre of the row with the mouse, which toggles the group when the click reaches the canvas. */
  public async doubleTapRowCentre(umbrellaId: string): Promise<void> {
    const centre = await this.rowCentreOf(umbrellaId);

    await this.page.mouse.dblclick(centre.x, centre.y);
  }

  /** Pans the canvas so the umbrella's rendered centre sits at the container's centre, where a wheel zooms about. */
  public async centreUmbrella(umbrellaId: string): Promise<void> {
    const node = await this.umbrellaOf(umbrellaId);
    const container = await this.canvas.container.evaluate(readRect);
    const dx = container.left + container.width / 2 - node.renderedX;
    const dy = container.top + container.height / 2 - node.renderedY;

    await this.canvas.panBy(dx, dy);
  }

  /** Wheels out over the container centre, one notch at a time, until the zoom is `zoom` or less. */
  public async zoomOutTo(zoom: number): Promise<void> {
    const isOut = async (): Promise<boolean> => {
      const now = await this.probe.zoom();

      return now <= zoom;
    };

    await this.canvas.zoomUntil(WHEEL_NOTCH_PX, isOut);
  }

  /** Wheels in over the container centre, one notch at a time, until the zoom is `zoom` or more. */
  public async zoomInTo(zoom: number): Promise<void> {
    const isIn = async (): Promise<boolean> => {
      const now = await this.probe.zoom();

      return now >= zoom;
    };

    await this.canvas.zoomUntil(-WHEEL_NOTCH_PX, isIn);
  }

  /** The label `id` draws while an export is on is `text`. */
  public async expectExportLabel(id: string, text: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.page.evaluate(exportLabelIn, id)).toEqual(text);
  }

  private async isUmbrellaInView(umbrellaId: string): Promise<boolean> {
    const box = await this.umbrellaBoxOf(umbrellaId);
    const container = await this.canvas.container.evaluate(readRect);

    return isInside(box, container);
  }

  /** The worst side of the row and of its chips' union: the row is always the node's width, so only the chips show an overflow. */
  private async worstMarginOf(umbrellaId: string): Promise<number> {
    const row = await this.rectOf(umbrellaId);
    const chips = await this.chipsRectOf(umbrellaId);
    const box = await this.umbrellaBoxOf(umbrellaId);
    const rowSides = Object.values(chipRowMarginsOf(row, box));
    const chipSides = Object.values(chipRowMarginsOf(chips, box));
    const sides = [...rowSides, ...chipSides];

    return Math.min(...sides);
  }

  /** The union of the chip boxes in the row of `umbrellaId`, in page CSS pixels. */
  private async chipsRectOf(umbrellaId: string): Promise<ElementRect> {
    const rects = await this.rowOf(umbrellaId).locator('.atom-chip').evaluateAll(readRects);

    if (rects.length === 0) throw new Error(`no chip is drawn for ${umbrellaId}`);

    return unionOf(rects);
  }

  /** The umbrella's rendered box in page CSS px, from the probe's centre and model size. */
  private async umbrellaBoxOf(umbrellaId: string): Promise<ElementRect> {
    const node = await this.umbrellaOf(umbrellaId);
    const zoom = await this.probe.zoom();

    return nodeBoxOf(node, zoom);
  }

  private async umbrellaOf(umbrellaId: string): Promise<ProbeNode> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === umbrellaId);

    if (node === undefined) throw new Error(`graph e2e: ${umbrellaId} is not drawn`);

    return node;
  }

  private async rowCentreOf(umbrellaId: string): Promise<ViewportPoint> {
    const rect = await this.rectOf(umbrellaId);
    const centre: ViewportPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    return centre;
  }

  private rowOf(umbrellaId: string): Locator {
    return this.page.locator(`.graph-widgets .atom-chips[data-umbrella="${umbrellaId}"]`);
  }
}
