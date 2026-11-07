import { test as base } from './graph-toolbar.fixture.ts';
import { GraphDetailsImports } from './pages/graph-details-imports.po.ts';
import { GraphImportsHost } from './pages/graph-imports-host.po.ts';

type GraphImportsFixtures = {
  readonly detailsImports: GraphDetailsImports;
  readonly graphImports: GraphImportsHost;
};

export const test = base.extend<GraphImportsFixtures>({
  detailsImports: async ({ page }, use): Promise<void> => {
    await use(new GraphDetailsImports(page));
  },
  graphImports: async ({ page }, use): Promise<void> => {
    await use(new GraphImportsHost(page));
  }
});
