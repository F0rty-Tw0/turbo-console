import { test } from './graph-modules.fixture.ts';
import { MODULES_DENSE_STUB } from './test/stubs/graph-modules.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';

const MODULES = { description: '2026-11-22-package-modules-graph spec 7.4', type: 'requirement' };

const GRAPH_ID = 'dir:src/graph';

const LAYERS = ['common', 'data-access', 'domain-logic', 'feature', 'test', 'ui', 'utils'];

const LAYER_IDS = LAYERS.map((name): string => `${GRAPH_ID}/${name}`);

const SRC_IDS = [
  'dir:',
  'dir:src',
  'file:index.ts',
  'file:src/main.ts',
  'dir:src/bridge',
  'dir:src/details',
  'dir:src/shared',
  'dir:src/styles'
];

/** Under D9 only the root opens: src holds main.ts directly. */
const D9_IDS = ['dir:', 'dir:src', 'file:index.ts', 'pkg:lib'];

/** With src open, src/graph is one card among src's folders. */
const SRC_OPEN_IDS = [...SRC_IDS, GRAPH_ID, 'pkg:lib'];

const DENSE_IDS = [...SRC_IDS, GRAPH_ID, 'file:src/graph/graph.ts', ...LAYER_IDS, 'pkg:lib'];

/** The links `MODULES_DENSE_STUB` rolls up to between the cards drawn with src/graph expanded. */
const DENSE_LINK_COUNT = 33;

test.describe('FEATURE: package modules links draw as plain lines', () => {
  test(
    'GIVEN a dense package with its graph folder expanded, every link is a bezier at card depth, as a package edge',
    { annotation: MODULES },
    async ({ graphCanvas, graphHost, graphList, graphModules, graphModulesHost, graphModulesLinks, graphPage }): Promise<void> => {
      await test.step('WHEN the dense app is shown in modules mode', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphModules.pressShowModules();
        await graphModulesHost.answerModules(MODULES_DENSE_STUB);
        await graphModules.expectIds(D9_IDS);
      });

      await test.step('AND the src card is tapped', async (): Promise<void> => {
        await graphCanvas.tapNode('dir:src');
        await graphModules.expectIds(SRC_OPEN_IDS);
      });

      await test.step('AND the src/graph card is tapped', async (): Promise<void> => graphCanvas.tapNode(GRAPH_ID));

      await test.step('THEN its seven layer folders are drawn as cards inside it', async (): Promise<void> =>
        graphModules.expectIds(DENSE_IDS));

      await test.step('AND every link is drawn as a plain bezier at card depth', async (): Promise<void> =>
        graphModulesLinks.expectEveryLinkPlain(DENSE_LINK_COUNT));
    }
  );
});
