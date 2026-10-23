import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphControlsPage } from './graph-controls.po.ts';
import { GraphDetailsPage } from './graph-details.po.ts';
import { GraphGroupingPage } from './graph-grouping.po.ts';
import { GraphHost } from './graph-host.po.ts';
import { GraphLook } from './graph-look.po.ts';
import { GraphPackageList } from './graph-package-list.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphToolbar } from './graph-toolbar.po.ts';
import { GraphWidgetsPage } from './graph-widgets.po.ts';
import { GraphPage } from './graph.po.ts';
import type { Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { ShotSetup } from '../common/graph-shots.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { ThemeStub } from '../common/graph.type.ts';
import { cachedShotState } from '../test/utils/graph-shot-state.spec.util.ts';

/** The bottom-right pixel of the 1280 x 800 viewport, where no graph, box or button sits. */
const PARKED_MOUSE = { x: 1279, y: 799 };

/** Opens the graph page into the exact settled state a theme shot compares: every pixel a function of the state and the theme. */
export class GraphShots {
  private readonly controls: GraphControlsPage;
  private readonly details: GraphDetailsPage;
  private readonly grouping: GraphGroupingPage;
  private readonly host: GraphHost;
  private readonly look: GraphLook;
  private readonly list: GraphPackageList;
  private readonly graph: GraphPage;
  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly toolbar: GraphToolbar;
  private readonly widgets: GraphWidgetsPage;

  public constructor(page: Page) {
    this.page = page;
    this.controls = new GraphControlsPage(page);
    this.details = new GraphDetailsPage(page);
    this.grouping = new GraphGroupingPage(page);
    this.host = new GraphHost(page);
    this.look = new GraphLook(page);
    this.list = new GraphPackageList(page);
    this.graph = new GraphPage(page);
    this.probe = new GraphProbePage(page);
    this.toolbar = new GraphToolbar(page);
    this.widgets = new GraphWidgetsPage(page);
  }

  /** Capture pass (ELK), reopen, theme, then the state with its captured cache; resolves settled. */
  public async openCached(setup: ShotSetup, theme: ThemeStub): Promise<void> {
    const positions = await this.captureLayout(setup);
    const cached = cachedShotState(setup, positions);

    await this.look.applyTheme(theme);
    await this.host.sendState(cached);
    await this.probe.expectLayoutEngine('cache');
    await this.settle();
  }

  /** Controls open, `name` selected by keyboard, Details open and headed `name`; settled. */
  public async inspect(name: string): Promise<void> {
    await this.controls.toggle();
    await this.list.focusName(name);
    await this.graph.pressKey('Enter');
    await this.probe.expectSelected(name);
    await this.details.toggle();
    await this.details.expectHeading(name);
    await this.settle();
  }

  /** Each folder's header row is visible. */
  public async expectHeaderRows(folders: string[]): Promise<void> {
    for (const folder of folders) await expect(this.widgets.rowOf(folder)).toBeVisible();
  }

  /** Opens the page, lays `setup.state` out with ELK, waits for the view to be saved and reopens the page from it. */
  private async captureLayout(setup: ShotSetup): Promise<Positions> {
    const savedState = setup.saved ?? undefined;

    await this.graph.open({ savedState });
    await this.host.sendState(setup.state);
    await this.probe.expectLayoutEngine('elk');

    const positions = await this.grouping.postedPositions();

    await this.host.expectViewSaved();
    await this.host.reopen();

    return positions;
  }

  /** Codicons drawn, canvas at its container's size, two frames painted, and no hover style under the mouse. */
  private async settle(): Promise<void> {
    await this.page.mouse.move(PARKED_MOUSE.x, PARKED_MOUSE.y);
    await this.toolbar.expectCodiconLoaded();
    await this.grouping.expectCanvasFitsContainer();
    await this.page.evaluate(NEXT_FRAME);
  }
}
