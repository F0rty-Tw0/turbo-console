import type { ConsoleMessage, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphPage } from './graph.po.ts';
import { CODICON_FONT, CODICON_WAIT_MS, GLYPH_CODE_POINTS, GLYPH_FALLBACK_WARNING } from '../../src/graph/common/graph-glyph.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { TASK_MODE_STATE_STUB } from '../test/stubs/graph-task-mode.stub.ts';
import { fontWaitOf } from '../test/utils/graph-font-wait.spec.util.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeTasksState } from '../test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from '../test/utils/graph-task-saved.spec.util.ts';

/** From the codicon.ttf request to `ready`: the font wait plus room for a slow runner, far under the mock's 3 s font hold. */
const READY_BUDGET_MS = CODICON_WAIT_MS + 500;

/** Every character the codicon font covers: Cytoscape draws a state glyph from it. */
const CODICON_RANGE = /[\uea60-\uf102]/u;

/** A task whose label is the bare name, and the umbrella whose counts line is wider than its name. */
const PLAIN_TASK = 'hub#build';

/** The task of the task-mode stub that a cold open chooses. */
const CHOSEN_TASK = 'app#build';

/** What `document.fonts.load` is asked for, as the page asks for it. */
type FontRequest = {
  readonly font: string;
  readonly text: string;
};

const FONT_REQUEST: FontRequest = { font: CODICON_FONT, text: GLYPH_CODE_POINTS.pass };

const loadedFaceCount = async ({ font, text }: FontRequest): Promise<number> => {
  const faces = await document.fonts.load(font, text);

  return faces.length;
};

/** The glyphs to measure, in the font the glyph sizer measures. */
type GlyphMeasure = {
  readonly font: string;
  readonly glyphs: string[];
};

/** Runs in the page: the canvas advance of each glyph in `font`; empty when the page has no 2d context. */
const glyphWidths = ({ font, glyphs }: GlyphMeasure): number[] => {
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) return [];

  context.font = font;

  return glyphs.map((glyph: string): number => context.measureText(glyph).width);
};

/** The widths of the two nodes the sizer wiring decides. */
type TaskSizes = {
  readonly task: number;
  readonly umbrella: number;
};

const hasGlyph = (node: ProbeNode): boolean => CODICON_RANGE.test(node.text);

/** The state glyphs of the drawn task graph, the width the sizers give its nodes, and the warning a held font leaves in the console. */
export class GraphTaskGlyphs {
  private readonly graphPage: GraphPage;
  private readonly host: GraphHost;
  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly warnings: string[];

  public constructor(page: Page) {
    this.page = page;
    this.graphPage = new GraphPage(page);
    this.host = new GraphHost(page);
    this.probe = new GraphProbePage(page);
    this.warnings = [];
  }

  /** Before the page loads: records the console warnings. */
  public watchConsole(): void {
    this.page.on('console', (message: ConsoleMessage): void => this.recordWarning(message));
  }

  /** Opens the target-like task graph with its Atomizer umbrella chosen and sends its state. */
  public async open(options: GraphOptions = {}): Promise<void> {
    const state = targetLikeTasksState();
    const savedState = taskSavedState(state.hash, { chosen: [TARGET_LIKE_UMBRELLA] });

    await this.graphPage.open({ ...options, savedState });
    await this.host.sendState(state);
  }

  /** Opens the task-mode stub with `app#build` chosen, sends its state and waits until that task is drawn. */
  public async openChosen(): Promise<void> {
    const savedState = taskSavedState(TASK_MODE_STATE_STUB.hash, { chosen: [CHOSEN_TASK] });

    await this.graphPage.open({ savedState });
    await this.host.sendState(TASK_MODE_STATE_STUB);
    await this.drawnWidthOf(CHOSEN_TASK);
  }

  /** The text drawn on task `id` starts with `glyph`. */
  public async expectFirstChar(id: string, glyph: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.firstCharOf(id)).toBe(glyph);
  }

  /** The node `id` is drawn `width` px wide; every glyph state of one node gives one width. */
  public async expectWidthOf(id: string, width: number): Promise<void> {
    await expect.poll(async (): Promise<number | null> => this.widthOf(id)).toBe(width);
  }

  /** The width of node `id`, read once it is drawn. */
  public async drawnWidthOf(id: string): Promise<number> {
    await expect.poll(async (): Promise<number | null> => this.widthOf(id)).not.toBeNull();

    const width = await this.widthOf(id);

    return width ?? 0;
  }

  /** The plain task is wider here than on `held`, a page whose font never came; the umbrella, wide from its counts line, is as wide. */
  public async expectWidthsAgainst(held: GraphTaskGlyphs): Promise<void> {
    const here = await this.sizes();
    const there = await held.sizes();

    expect(here.task).toBeGreaterThan(there.task);
    expect(here.umbrella).toBe(there.umbrella);
  }

  /** A node is drawn and no drawn label holds a codicon character. */
  public async expectPlainLabels(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.drawnCount()).toBeGreaterThan(0);

    const nodes = await this.probe.nodes();
    const glyphed = nodes.filter(hasGlyph).map((node) => node.id);

    expect(glyphed).toEqual([]);
  }

  /** After the font arrived: every state glyph is as wide as the blank glyph, so the slot the sizer measures fits each state. */
  public async expectGlyphsAsWideAsBlank(): Promise<void> {
    const glyphs: string[] = Object.values(GLYPH_CODE_POINTS);
    const widths = await this.page.evaluate(glyphWidths, { font: CODICON_FONT, glyphs });
    const blankWidth = widths[glyphs.indexOf(GLYPH_CODE_POINTS.blank)];

    expect(widths).toEqual(glyphs.map((): number | undefined => blankWidth));
  }

  /** The page posted `ready` within the font wait of asking for codicon.ttf, not when the held font came. */
  public async expectReadyWithinFontWait(): Promise<void> {
    await expect.poll(async (): Promise<number | null> => fontWaitOf(this.page)).not.toBeNull();

    const waited = await fontWaitOf(this.page);

    expect(waited).toBeLessThan(READY_BUDGET_MS);
  }

  /** The font the page gave up on has come: the load the page asked for resolves with a face. */
  public async expectFontArrived(): Promise<void> {
    const faces = await this.page.evaluate(loadedFaceCount, FONT_REQUEST);

    expect(faces).toBeGreaterThanOrEqual(1);
  }

  public expectNoErrors(): void {
    this.graphPage.expectNoErrors();
  }

  public expectWarnedOnce(): void {
    const warned = this.warnings.filter((text) => text === GLYPH_FALLBACK_WARNING);

    expect(warned).toHaveLength(1);
  }

  private recordWarning(message: ConsoleMessage): void {
    const type = message.type();

    if (type === 'warning') this.warnings.push(message.text());
  }

  private async sizes(): Promise<TaskSizes> {
    const task = await this.drawnWidthOf(PLAIN_TASK);
    const umbrella = await this.drawnWidthOf(TARGET_LIKE_UMBRELLA);
    const sizes: TaskSizes = { task, umbrella };

    return sizes;
  }

  private async drawnCount(): Promise<number> {
    const nodes = await this.probe.nodes();

    return nodes.length;
  }

  private async firstCharOf(id: string): Promise<string | null> {
    const node = await this.nodeOf(id);

    return node?.text.charAt(0) ?? null;
  }

  private async widthOf(id: string): Promise<number | null> {
    const node = await this.nodeOf(id);

    return node?.width ?? null;
  }

  private async nodeOf(id: string): Promise<ProbeNode | undefined> {
    const nodes = await this.probe.nodes();

    return nodes.find((node) => node.id === id);
  }
}
