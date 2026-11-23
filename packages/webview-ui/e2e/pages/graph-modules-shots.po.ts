import type { Page } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphGroupingPage } from './graph-grouping.po.ts';
import { GraphHost } from './graph-host.po.ts';
import { GraphLook } from './graph-look.po.ts';
import { GraphModulesHost } from './graph-modules-host.po.ts';
import { GraphModulesPage } from './graph-modules.po.ts';
import { GraphPointer } from './graph-pointer.po.ts';
import { GraphToolbar } from './graph-toolbar.po.ts';
import { GraphPage } from './graph.po.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import { D9_IDS, VIEWS_EDGES, VIEWS_IDS } from '../common/graph-modules.const.ts';
import type { ThemeStub } from '../common/graph-theme.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import { MODULES_APP_STUB } from '../test/stubs/graph-modules.stub.ts';
import { TASK_MODE_STATE_STUB } from '../test/stubs/graph-task-mode.stub.ts';

/** The bottom-right pixel of the 1280 x 800 viewport, where no graph, box or button sits. */
const PARKED_MOUSE = { x: 1279, y: 799 };

/** The folder the shot opens: its box holds file cards beside the collapsed `model` card and the `lib` stub. */
const VIEWS_ID = 'dir:src/views';

/** Opens modules mode into the exact settled state a theme shot compares: every pixel a function of the stub and the theme. */
export class GraphModulesShots {
  private readonly canvas: GraphCanvas;
  private readonly graph: GraphPage;
  private readonly grouping: GraphGroupingPage;
  private readonly host: GraphHost;
  private readonly look: GraphLook;
  private readonly modules: GraphModulesPage;
  private readonly modulesHost: GraphModulesHost;
  private readonly page: Page;
  private readonly pointer: GraphPointer;
  private readonly toolbar: GraphToolbar;

  public constructor(page: Page) {
    this.page = page;
    this.canvas = new GraphCanvas(page);
    this.graph = new GraphPage(page);
    this.grouping = new GraphGroupingPage(page);
    this.host = new GraphHost(page);
    this.look = new GraphLook(page);
    this.modules = new GraphModulesPage(page);
    this.modulesHost = new GraphModulesHost(page);
    this.pointer = new GraphPointer(page);
    this.toolbar = new GraphToolbar(page);
  }

  /**
   * `app`'s modules at D9 under `theme`, then `views` expanded and fitted; settled. Reduced motion is on before the page
   * opens, so the expand never animates. The expand keeps the `views` centre where it was, which pushes `index.ts` and
   * the `lib` stub off screen; Fit, pressed on a settled canvas, brings the whole graph back into the shot.
   */
  public async openModules(theme: ThemeStub): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: 'reduce' });
    await this.graph.open();
    await this.look.applyTheme(theme);
    await this.host.sendState(TASK_MODE_STATE_STUB);
    await this.modulesHost.sendShowModules('app');
    await this.modulesHost.answerModules(MODULES_APP_STUB);
    await this.modules.expectIds(D9_IDS);
    await this.canvas.tapNode(VIEWS_ID);
    await this.modules.expectIds(VIEWS_IDS);
    await this.modules.expectEdges(VIEWS_EDGES);
    await this.settle();
    await this.graph.pressButton(FIT_LABEL);
    await this.settle();
  }

  /**
   * Codicons drawn, canvas at its container's size, a frame painted, no hover style under the mouse, and the canvas
   * quiet: a freshly drawn graph still refines its textures, and a shot during that work varies run to run.
   */
  private async settle(): Promise<void> {
    await this.page.mouse.move(PARKED_MOUSE.x, PARKED_MOUSE.y);
    await this.toolbar.expectCodiconLoaded();
    await this.grouping.expectCanvasFitsContainer();
    await this.page.evaluate(NEXT_FRAME);
    await this.pointer.waitForQuietCanvas();
  }
}
