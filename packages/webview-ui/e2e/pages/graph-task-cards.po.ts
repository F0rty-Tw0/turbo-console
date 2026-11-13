import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphPage } from './graph.po.ts';
import type { GraphReady, GraphTask } from '../../src/bridge/common/graph-state.type.ts';
import { CODICON_FONT, GLYPH_CODE_POINTS } from '../../src/graph/common/graph-glyph.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { NODE_FONT_SIZE } from '../../src/graph/common/graph.const.ts';
import type { GraphOpenOptions } from '../common/graph-open.type.ts';
import type { BoldRow, FontCheck } from '../test/common/graph-card-measure.type.ts';
import { TASK_MODE_STATE_STUB } from '../test/stubs/graph-task-mode.stub.ts';
import { boldGlyphWidths, boldRowWidth, isFontLoaded } from '../test/utils/graph-card-measure.spec.util.ts';
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

/** A card's cached label box against its measured label: `isFit` when the label is wider than the floor and the box holds it. */
type LabelFit = {
  readonly isFit: boolean;
  readonly box: number | null;
  readonly label: number;
};

const NO_LABEL_FIT: LabelFit = { isFit: false, box: null, label: 0 };

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
  public async openLong(options: GraphOpenOptions = {}): Promise<void> {
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

  /** The codicon font has not arrived: a state glyph's face is still unloaded, so the page decided its glyphs without it. */
  public async expectCodiconHeld(): Promise<void> {
    const check: FontCheck = { font: CODICON_FONT, text: GLYPH_CODE_POINTS.pass };

    await expect.poll(async (): Promise<boolean> => this.page.evaluate(isFontLoaded, check)).toBe(false);
  }

  /**
   * At bold weight every state glyph is as wide as the blank glyph, so the bold slot the card sizer measures fits each state;
   * and the blank glyph's width is not what the body font alone gives that code point, so the codicon font is the one measured.
   */
  public async expectBoldGlyphsAsWideAsBlank(): Promise<void> {
    const glyphs: string[] = Object.values(GLYPH_CODE_POINTS);
    const widths = await this.page.evaluate(boldGlyphWidths, { font: `bold ${CODICON_FONT}`, glyphs, px: NODE_FONT_SIZE });
    const blankAt = glyphs.indexOf(GLYPH_CODE_POINTS.blank);
    const blankWidth = widths.codicon[blankAt];

    expect(widths.codicon).toEqual(glyphs.map((): number | undefined => blankWidth));
    expect(blankWidth).not.toBe(widths.body[blankAt]);
  }

  /** The label of `id` is wider than `minLabelPx` and its cached label box is at least as wide; a failure prints both widths. */
  public async expectLabelBoxFits(id: string, minLabelPx: number): Promise<void> {
    const fit = expect.objectContaining({ isFit: true });

    await expect.poll(async (): Promise<LabelFit> => this.labelFitOf(id, minLabelPx)).toEqual(fit);
  }

  private async labelFitOf(id: string, minLabelPx: number): Promise<LabelFit> {
    const node = await this.nodeOf(id);

    if (node === undefined) return NO_LABEL_FIT;

    const box = node.labelBoxWidth;
    const label = node.labelWidth;
    const isFit = box !== null && label > minLabelPx && box >= label;
    const fit: LabelFit = { isFit, box, label };

    return fit;
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
