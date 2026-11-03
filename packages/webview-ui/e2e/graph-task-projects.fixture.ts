import { test as graphTaskViewTest } from './graph-task-view.fixture.ts';
import { GraphTaskProjects } from './pages/graph-task-projects.po.ts';

type GraphTaskProjectsFixtures = {
  readonly graphTaskProjects: GraphTaskProjects;
};

/** The task View fixtures plus the Projects grid of the task Controls panel. */
export const test = graphTaskViewTest.extend<GraphTaskProjectsFixtures>({
  graphTaskProjects: async ({ page }, use): Promise<void> => {
    await use(new GraphTaskProjects(page));
  }
});

export { expect } from '@playwright/test';
