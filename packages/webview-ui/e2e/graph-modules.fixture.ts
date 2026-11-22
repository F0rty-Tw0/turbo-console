import { D9_IDS } from './common/graph-modules.const.ts';
import { test as base } from './graph-task.fixture.ts';
import { GraphModulesHost } from './pages/graph-modules-host.po.ts';
import { GraphModulesRoutes } from './pages/graph-modules-routes.po.ts';
import { GraphModulesTiming } from './pages/graph-modules-timing.po.ts';
import { GraphModulesPage } from './pages/graph-modules.po.ts';
import { MODULES_APP_STUB } from './test/stubs/graph-modules.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';

/** Opens the package graph, picks `app`, presses the Details panel's Show modules and answers with `MODULES_APP_STUB`, drawn at D9. */
type ShownModules = () => Promise<void>;

type GraphModulesFixtures = {
  readonly graphModules: GraphModulesPage;
  readonly graphModulesHost: GraphModulesHost;
  readonly graphModulesRoutes: GraphModulesRoutes;
  readonly graphModulesTiming: GraphModulesTiming;
  readonly shownModules: ShownModules;
};

/** The task fixtures plus modules mode's page parts, its host side, its link routes and the reply-to-frame timing. */
export const test = base.extend<GraphModulesFixtures>({
  graphModules: async ({ page }, use): Promise<void> => {
    await use(new GraphModulesPage(page));
  },
  graphModulesHost: async ({ page }, use): Promise<void> => {
    await use(new GraphModulesHost(page));
  },
  graphModulesRoutes: async ({ page }, use): Promise<void> => {
    await use(new GraphModulesRoutes(page));
  },
  graphModulesTiming: async ({ page }, use): Promise<void> => {
    await use(new GraphModulesTiming(page));
  },
  shownModules: async ({ graphHost, graphList, graphModules, graphModulesHost, graphPage }, use): Promise<void> => {
    const show: ShownModules = async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphList.pick('app');
      await graphModules.pressShowModules();
      await graphModulesHost.answerModules(MODULES_APP_STUB);
      await graphModules.expectIds(D9_IDS);
    };

    await use(show);
  }
});

export { expect } from '@playwright/test';
