import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphHost } from './graph-host.po.ts';
import { GraphPage } from './graph.po.ts';
import type { GraphSetViewToggleMessage } from '../../src/bridge/common/graph-message.type.ts';
import { SHOW_PREDICTION_LABEL } from '../../src/graph/common/graph-task.const.ts';
import { TASK_MODE_STATE_STUB } from '../test/stubs/graph-task-mode.stub.ts';
import { readPosted, viewTogglesPosted } from '../test/utils/graph-posted.spec.util.ts';
import { savedWith } from '../test/utils/graph-saved-state.spec.util.ts';
import { taskSavedState, taskViewOf } from '../test/utils/graph-task-saved.spec.util.ts';

const CHOSEN = ['app#build'];

/** The task graph's cache prediction part: the Show cache prediction box and the state the host sends with the toggle on or off. */
export class GraphTaskPrediction {
  private readonly checkbox: Locator;
  private readonly graphPage: GraphPage;
  private readonly host: GraphHost;
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.graphPage = new GraphPage(page);
    this.host = new GraphHost(page);
    this.checkbox = page.getByRole('checkbox', { name: SHOW_PREDICTION_LABEL, exact: true });
  }

  /** Opens the task-mode stub with `app#build` chosen and sends its state with the prediction toggle `shown`. */
  public async open(predictionShown: boolean): Promise<void> {
    const savedState = taskSavedState(TASK_MODE_STATE_STUB.hash, { chosen: CHOSEN });

    await this.graphPage.open({ savedState });
    await this.sendState(predictionShown);
  }

  /** Opens a panel restored in packages mode, with `app#build` chosen in its saved task view, and sends the state. */
  public async openInPackages(predictionShown: boolean): Promise<void> {
    const task = taskViewOf({ chosen: CHOSEN });
    const savedState = savedWith(TASK_MODE_STATE_STUB.hash, { mode: 'packages', task });

    await this.graphPage.open({ savedState });
    await this.sendState(predictionShown);
  }

  /** The host sends the stub's state with the toggle `predictionShown`. */
  public async sendState(predictionShown: boolean): Promise<void> {
    await this.host.sendState({ ...TASK_MODE_STATE_STUB, predictionShown });
  }

  /** Clicks the Show cache prediction box. */
  public async tick(): Promise<void> {
    await this.checkbox.click();
  }

  /** The Show cache prediction box is shown and ticked or not. */
  public async expectTicked(isChecked: boolean): Promise<void> {
    await expect(this.checkbox).toBeVisible();
    await expect(this.checkbox).toBeChecked({ checked: isChecked });
  }

  /** Polls until the page's `setViewToggle` posts, in order, are `expected`. */
  public async expectTogglePosts(expected: GraphSetViewToggleMessage[]): Promise<void> {
    await expect.poll(async (): Promise<GraphSetViewToggleMessage[]> => this.togglePosts()).toEqual(expected);
  }

  private async togglePosts(): Promise<GraphSetViewToggleMessage[]> {
    const posted = await readPosted(this.page);

    return viewTogglesPosted(posted);
  }
}
