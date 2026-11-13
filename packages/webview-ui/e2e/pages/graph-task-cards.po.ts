import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphPage } from './graph.po.ts';
import type { GraphReady, GraphTask } from '../../src/bridge/common/graph-state.type.ts';
import { CODICON_FONT, GLYPH_CODE_POINTS } from '../../src/graph/common/graph-glyph.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { NODE_FONT_SIZE } from '../../src/graph/common/graph.const.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { TASK_MODE_STATE_STUB } from '../test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from '../test/utils/graph-task-saved.spec.util.ts';

/** The spec numbers written out, so a changed constant cannot move the oracle with it. */
const MIN_WIDTH = 180;

const PADDING_X = 24;

/** A name no 180 px card fits: its row is wider than the minimum width at any weight. */
const LONG_NAME = 'build-everything-for-the-production-release';

const LONG_ID = `app#${LONG_NAME}`;

const LONG_TASK: GraphTask = {
  id: LONG_ID,
  packageName: 'app',
  name: LONG_NAME,
  command: LONG_NAME,
  isRunnable: true,
  isTurboTask: true,
  dependencies: []
};

/** The task-mode stub plus `LONG_TASK`, in the package `app`. */
const LONG_STATE: GraphReady = { ...TASK_MODE_STATE_STUB, tasks: TASK_MODE_STATE_STUB.tasks.concat(LONG_TASK) };

type CardSize = {
  readonly width: number;
  readonly height: number;
};

/** What the page measures: the glyph slot and `name` at bold, in the font list the card sizer measures with. */
type BoldRow = {
  readonly name: string;
  readonly isGlyphed: boolean;
  readonly blank: string;
  readonly px: number;
};

/** Runs in the page: the canvas advance of a card's bold row 1, in the body's font family, as the card sizer measures it. */
const boldRowWidth = async ({ name, isGlyphed, blank, px }: BoldRow): Promise<number> => {
  const family = getComputedStyle(document.body).fontFamily;
  const font = isGlyphed ? `bold ${px}px codicon, ${family}` : `bold ${px}px ${family}`;
  const text = isGlyphed ? `${blank} ${name}` : name;
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) return 0;

  await document.fonts.load(font, text);

  context.font = font;

  return context.measureText(text).width;
};

/** The glyphs to measure at bold, in the codicon font. */
type BoldGlyphs = {
  readonly font: string;
  readonly glyphs: string[];
};

/** Runs in the page: the canvas advance of each glyph at bold weight; empty when the page has no 2d context. */
const boldGlyphWidths = async ({ font, glyphs }: BoldGlyphs): Promise<number[]> => {
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) return [];

  await document.fonts.load(font, glyphs.join(''));

  context.font = font;

  return glyphs.map((glyph: string): number => context.measureText(glyph).width);
};

/** The status card of a plain task: its drawn size, and the width a name wider than the minimum gives it. */
export class GraphTaskCards {
  private readonly graphPage: GraphPage;
  private readonly host: GraphHost;
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.graphPage = new GraphPage(page);
    this.host = new GraphHost(page);
    this.probe = new GraphProbePage(page);
  }

  /** Opens the task-mode stub with the long-named task chosen and waits until it is drawn. */
  public async openLong(options: GraphOptions = {}): Promise<void> {
    const savedState = taskSavedState(LONG_STATE.hash, { chosen: [LONG_ID] });

    await this.graphPage.open({ ...options, savedState });
    await this.host.sendState(LONG_STATE);
    await this.widthOfLong();
  }

  /** The node `id` is drawn `size.width` by `size.height`. */
  public async expectCardSize(id: string, size: CardSize): Promise<void> {
    await expect.poll(async (): Promise<CardSize | null> => this.sizeOf(id)).toEqual(size);
  }

  /** The long-named card is wider than the minimum and exactly as wide as its bold row 1 plus the padding, measured in this page. */
  public async expectLongCardFitsBoldRow(isGlyphed: boolean): Promise<void> {
    const blank = GLYPH_CODE_POINTS.blank;
    const row: BoldRow = { name: LONG_NAME, isGlyphed, blank, px: NODE_FONT_SIZE };
    const rowWidth = await this.page.evaluate(boldRowWidth, row);
    const width = await this.widthOfLong();

    expect(width).toBeGreaterThan(MIN_WIDTH);
    expect(width).toBeCloseTo(rowWidth + PADDING_X, 2);
  }

  /** The long-named card keeps its width: another read after the held font arrived gives `width`. */
  public async expectLongWidth(width: number): Promise<void> {
    await expect.poll(async (): Promise<number | null> => this.widthOfNode(LONG_ID)).toBe(width);
  }

  /** The drawn width of the long-named card. */
  public async widthOfLong(): Promise<number> {
    await expect.poll(async (): Promise<number | null> => this.widthOfNode(LONG_ID)).not.toBeNull();

    const width = await this.widthOfNode(LONG_ID);

    return width ?? 0;
  }

  /** At bold weight every state glyph is as wide as the blank glyph, so the bold slot the card sizer measures fits each state. */
  public async expectBoldGlyphsAsWideAsBlank(): Promise<void> {
    const glyphs: string[] = Object.values(GLYPH_CODE_POINTS);
    const widths = await this.page.evaluate(boldGlyphWidths, { font: `bold ${CODICON_FONT}`, glyphs });
    const blankWidth = widths[glyphs.indexOf(GLYPH_CODE_POINTS.blank)];

    expect(widths).toEqual(glyphs.map((): number | undefined => blankWidth));
  }

  private async sizeOf(id: string): Promise<CardSize | null> {
    const node = await this.nodeOf(id);

    if (node === undefined) return null;

    const size: CardSize = { width: node.width, height: node.height };

    return size;
  }

  private async widthOfNode(id: string): Promise<number | null> {
    const node = await this.nodeOf(id);

    return node?.width ?? null;
  }

  private async nodeOf(id: string): Promise<ProbeNode | undefined> {
    const nodes = await this.probe.nodes();

    return nodes.find((node) => node.id === id);
  }
}
