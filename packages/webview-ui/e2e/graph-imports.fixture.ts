import { test as base } from './graph-toolbar.fixture.ts';
import { GraphDetailsImports } from './pages/graph-details-imports.po.ts';
import { GraphImportsHost } from './pages/graph-imports-host.po.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';

type ShownLink = (source: string, target: string) => Promise<void>;

type GraphImportsFixtures = {
  readonly detailsImports: GraphDetailsImports;
  readonly graphImports: GraphImportsHost;
  readonly shownLink: ShownLink;
};

export const test = base.extend<GraphImportsFixtures>({
  detailsImports: async ({ page }, use): Promise<void> => {
    await use(new GraphDetailsImports(page));
  },
  graphImports: async ({ page }, use): Promise<void> => {
    await use(new GraphImportsHost(page));
  },
  shownLink: async ({ graphHost, graphLink, graphPage }, use): Promise<void> => {
    const show: ShownLink = async (source, target): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(DETAILS_STUB);
      await graphLink.tapLink(source, target);
    };

    await use(show);
  }
});
