import { test as graphTaskViewTest } from './graph-task-view.fixture.ts';
import { GraphTaskProjects } from './pages/graph-task-projects.po.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

/** Opens the page on `savedState` (none: the flat default), sends `state` and waits for its package nodes. */
type OpenState = (state: GraphReady, savedState?: GraphViewState) => Promise<void>;

type GraphTaskProjectsFixtures = {
  readonly graphTaskProjects: GraphTaskProjects;
  readonly openState: OpenState;
};

/** The task View fixtures plus the Projects grid of the task Controls panel and the page opened on a state. */
export const test = graphTaskViewTest.extend<GraphTaskProjectsFixtures>({
  graphTaskProjects: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskProjects(page));
  },
  openState: async ({ graphHost, graphPage, graphProbe }, use): Promise<void> => {
    const open = async (state: GraphReady, savedState?: GraphViewState): Promise<void> => {
      await graphPage.open({ savedState });
      await graphHost.sendState(state);
      await graphProbe.expectNodeIds(stateNamesOf(state));
    };

    await use(open);
  }
});

export { expect } from '@playwright/test';
