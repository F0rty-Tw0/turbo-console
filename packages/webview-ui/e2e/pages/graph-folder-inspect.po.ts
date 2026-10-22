/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphPage } from './graph.po.ts';
import type { GraphReady } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeFolder, ProbeFolderLink, ProbeState } from '../../src/graph/common/graph-probe.type.ts';
import { DETAILS_LABEL } from '../../src/graph/common/graph.const.ts';
import type { AnchorBox } from '../../src/graph/common/keep-clear.type.ts';
import type { FolderViewFacts } from '../common/graph-folders.type.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { folderPadTapOf } from '../test/utils/graph-folder-points.spec.util.ts';
import { boxRectOf, folderKeyed } from '../test/utils/graph-folders.spec.util.ts';
import { isClearOf } from '../test/utils/graph-narrow.spec.util.ts';

const ariaLabelsOf = (buttons: Element[]): (string | null)[] =>
  buttons.map((button): string | null => button.getAttribute('aria-label'));

const isLinkBetween = (source: string, target: string): ((link: ProbeFolderLink) => boolean) => {
  return (link): boolean => link.source === source && link.target === target;
};

/** The folder boxes' taps, the details panel's folder view and the list header's buttons of one folder. */
export class GraphFolderInspect {
  private readonly graph: GraphPage;
  private readonly grid: Locator;
  private readonly host: GraphHost;
  private readonly page: Page;
  private readonly panel: Locator;
  private readonly probe: GraphProbePage;
  private readonly view: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.graph = new GraphPage(page);
    this.host = new GraphHost(page);
    this.probe = new GraphProbePage(page);
    this.grid = page.getByRole('grid');
    this.panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
    this.view = this.panel.locator('[data-view="folder"]');
  }

  /** Opens the graph page with `saved` as its kept view state, then sends `state`. */
  public async open(saved: unknown, state: GraphReady, options: GraphOptions = {}): Promise<void> {
    await this.graph.open({ ...options, savedState: saved });
    await this.host.sendState(state);
  }

  public async folders(): Promise<ProbeFolder[]> {
    return this.page.evaluate((): ProbeFolder[] => window.__tcGraphProbe?.folders() ?? []);
  }

  /** Taps a collapsed folder's centre, or an expanded one's left padding at mid height, where no package or link sits. */
  public async tapFolder(folder: string): Promise<void> {
    const folders = await this.folders();
    const zoom = await this.probe.zoom();
    const found = folderKeyed(folders, folder);
    const point = folderPadTapOf(found, zoom);

    await this.page.mouse.click(point.x, point.y);
  }

  /** Presses the details panel's button named exactly `name`. */
  public async pressAction(name: string): Promise<void> {
    await this.panel.getByRole('button', { name, exact: true }).click();
  }

  /** Forced: a hidden member's button is `aria-disabled`, and a real click still lands on it. */
  public async pressMember(name: string): Promise<void> {
    await this.view.getByRole('button', { name, exact: true }).click({ force: true });
  }

  public async pressHeaderFocus(title: string): Promise<void> {
    await this.headerFocus(title).click();
  }

  public async expectFolderState(folder: string, state: ProbeState): Promise<void> {
    await expect.poll(async (): Promise<ProbeState | undefined> => this.stateOf(folder)).toBe(state);
  }

  public async expectFolderLinkState(source: string, target: string, state: ProbeState): Promise<void> {
    await expect.poll(async (): Promise<ProbeState | undefined> => this.linkStateOf(source, target)).toBe(state);
  }

  /** The folder view's title, summary line, action buttons and member packages, in order. */
  public async expectFolderView(facts: FolderViewFacts): Promise<void> {
    await expect(this.view.getByRole('heading', { level: 2 })).toHaveText(facts.heading);
    await expect(this.view.locator('.details-path')).toHaveText(facts.summary);
    await expect(this.view.locator('.details-actions button')).toHaveText(facts.buttons);
    await expect(this.view.locator('.details-list .details-name')).toHaveText(facts.packages);
  }

  /** A hidden member reads "hidden" and its button is `aria-disabled`; a shown one does neither. */
  public async expectMemberHidden(name: string, isHidden: boolean): Promise<void> {
    const named = this.page.getByRole('button', { name, exact: true });
    const item = this.view.getByRole('listitem').filter({ has: named });
    const pick = item.getByRole('button');
    const expected = isHidden ? 'true' : null;

    await expect(item.getByText('hidden', { exact: true })).toBeVisible({ visible: isHidden });
    await expect.poll(async (): Promise<string | null> => pick.getAttribute('aria-disabled')).toBe(expected);
  }

  /** The list header of the folder titled `title` holds exactly these buttons, by accessible name. */
  public async expectHeaderButtons(title: string, labels: string[]): Promise<void> {
    const buttons = this.headerOf(title).getByRole('button');

    await expect.poll(async (): Promise<(string | null)[]> => buttons.evaluateAll(ariaLabelsOf)).toEqual(labels);
  }

  /** The header Focus button of the folder titled `title` reads `Focus` or `Clear focus`. */
  public async expectHeaderFocusText(title: string, text: 'Focus' | 'Clear focus'): Promise<void> {
    await expect(this.headerFocus(title)).toHaveText(text);
  }

  /** The folder's frame ends left of the details overlay with the keep-clear margin to spare. */
  public async expectFolderClear(folder: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isClearOfOverlay(folder)).toBe(true);
  }

  private async isClearOfOverlay(folder: string): Promise<boolean> {
    const folders = await this.folders();
    const rect = boxRectOf(folderKeyed(folders, folder));
    const overlay = await this.panel.evaluate(readRect);
    const box: AnchorBox = { x1: rect.left, x2: rect.left + rect.width };

    return isClearOf(box, overlay.left);
  }

  private headerOf(title: string): Locator {
    const collapse = this.page.getByRole('button', { name: `Collapse folder ${title}`, exact: true });
    const expand = this.page.getByRole('button', { name: `Expand folder ${title}`, exact: true });

    return this.grid.getByRole('row').filter({ has: collapse.or(expand) });
  }

  private headerFocus(title: string): Locator {
    return this.headerOf(title).getByRole('button', { name: `Focus folder ${title}`, exact: true });
  }

  private async stateOf(folder: string): Promise<ProbeState | undefined> {
    const folders = await this.folders();
    const found = folders.find((candidate): boolean => candidate.folder === folder);

    return found?.state;
  }

  private async linkStateOf(source: string, target: string): Promise<ProbeState | undefined> {
    const links = await this.page.evaluate((): ProbeFolderLink[] => window.__tcGraphProbe?.folderLinks() ?? []);
    const found = links.find(isLinkBetween(source, target));

    return found?.state;
  }
}
