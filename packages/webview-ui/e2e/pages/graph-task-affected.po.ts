import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphHost } from './graph-host.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphPage } from './graph.po.ts';
import type { GraphSetViewToggleMessage } from '../../src/bridge/common/graph-message.type.ts';
import { SHOW_AFFECTED_LABEL } from '../../src/graph/common/graph-task.const.ts';
import { TASK_MODE_STATE_STUB } from '../test/stubs/graph-task-mode.stub.ts';
import { readPosted, viewTogglesPosted } from '../test/utils/graph-posted.spec.util.ts';
import { taskSavedState } from '../test/utils/graph-task-saved.spec.util.ts';

const CHOSEN = ['app#build'];

/** Decimal places two halo opacities must agree to: the products 0.4 x 0.25 and 0.18 x 0.25 carry float noise. */
const HALO_DIGITS = 4;

/** The task graph's affected part: the Show affected box, the state the host sends with the toggle on or off, and the halo under a task. */
export class GraphTaskAffected {
  private readonly checkbox: Locator;
  private readonly graphPage: GraphPage;
  private readonly host: GraphHost;
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.graphPage = new GraphPage(page);
    this.host = new GraphHost(page);
    this.probe = new GraphProbePage(page);
    this.checkbox = page.getByRole('checkbox', { name: SHOW_AFFECTED_LABEL, exact: true });
  }

  /** Opens the task-mode stub with `app#build` chosen and sends its state with the affected toggle `affectedShown`. */
  public async open(affectedShown: boolean): Promise<void> {
    const savedState = taskSavedState(TASK_MODE_STATE_STUB.hash, { chosen: CHOSEN });

    await this.graphPage.open({ savedState });
    await this.sendState(affectedShown);
  }

  /** The host sends the stub's state with the toggle `affectedShown`. */
  public async sendState(affectedShown: boolean): Promise<void> {
    await this.host.sendState({ ...TASK_MODE_STATE_STUB, affectedShown });
  }

  /** Clicks the Show affected box. */
  public async tick(): Promise<void> {
    await this.checkbox.click();
  }

  /** The Show affected box is shown and ticked or not. */
  public async expectTicked(isChecked: boolean): Promise<void> {
    await expect(this.checkbox).toBeVisible();
    await expect(this.checkbox).toBeChecked({ checked: isChecked });
  }

  /** Polls until the page's `setViewToggle` posts, in order, are `expected`. */
  public async expectTogglePosts(expected: GraphSetViewToggleMessage[]): Promise<void> {
    await expect.poll(async (): Promise<GraphSetViewToggleMessage[]> => this.togglePosts()).toEqual(expected);
  }

  /** Polls until the halo under task `id` has `opacity`; 0 is no halo. */
  public async expectHalo(id: string, opacity: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.haloOf(id)).toBeCloseTo(opacity, HALO_DIGITS);
  }

  private async haloOf(id: string): Promise<number> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => candidate.id === id);

    return node?.underlayOpacity ?? Number.NaN;
  }

  private async togglePosts(): Promise<GraphSetViewToggleMessage[]> {
    const posted = await readPosted(this.page);

    return viewTogglesPosted(posted);
  }
}
