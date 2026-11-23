import {
  BACK_LABEL,
  D9_EDGES,
  D9_IDS,
  LAZIES_LABEL,
  SHOW_MODULES_LABEL,
  TESTS_LABEL,
  TYPES_LABEL,
  VIEWS_EDGES,
  VIEWS_IDS,
  VIEWS_TESTS_EDGES,
  VIEWS_TESTS_IDS
} from './common/graph-modules.const.ts';
import { expect, test } from './graph-modules.fixture.ts';
import { MODULES_APP_STUB } from './test/stubs/graph-modules.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import type { GraphOpenImportMessage } from '../src/bridge/common/graph-imports.type.ts';

const MODULES = { description: '2026-11-22-package-modules-graph spec 7, 9', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const OPEN_INDEX: GraphOpenImportMessage = { type: 'openImport', packageName: 'app', file: 'index.ts', line: 0 };

const without = (items: string[], gone: string[]): string[] => items.filter((item): boolean => !gone.includes(item));

type Toggle = {
  readonly label: string;
  /** Whether the box starts checked on a fresh view; the test flips it to the other state. */
  readonly isChecked: boolean;
  readonly change: string;
  readonly ids: string[];
  readonly edges: string[];
};

const TYPE_EDGE = 'file:src/views/main.ts→dir:src/model dashed';

const LAZY_EDGE = 'file:src/views/panel.ts→dir:src/model dotted';

/** Each View box with views expanded on a fresh view: what flipping it changes in the drawn graph. */
const TOGGLES: Toggle[] = [
  {
    label: TYPES_LABEL,
    isChecked: true,
    change: 'hides the type-only link',
    ids: VIEWS_IDS,
    edges: without(VIEWS_EDGES, [TYPE_EDGE])
  },
  { label: TESTS_LABEL, isChecked: false, change: 'shows main.spec.ts and its link', ids: VIEWS_TESTS_IDS, edges: VIEWS_TESTS_EDGES },
  {
    label: LAZIES_LABEL,
    isChecked: true,
    change: 'hides the lazy link',
    ids: VIEWS_IDS,
    edges: without(VIEWS_EDGES, [LAZY_EDGE])
  }
];

test.describe('FEATURE: package modules view', () => {
  test(
    'GIVEN app picked in the package graph, Show modules in the details panel asks once and draws the D9 view',
    { annotation: MODULES },
    async ({ graphHost, graphList, graphModules, graphModulesHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the package graph is drawn and app is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphList.pick('app');
      });

      await test.step('AND Show modules is pressed in the details panel', async (): Promise<void> => graphModules.pressShowModules());

      await test.step('THEN the page asks for app once', async (): Promise<void> => graphModulesHost.expectModulesAsked('app', 1));

      await test.step('AND the bar reads Scanning app…', async (): Promise<void> => graphModules.expectBarText('Scanning app…'));

      await test.step("WHEN the host answers with app's modules", async (): Promise<void> =>
        graphModulesHost.answerModules(MODULES_APP_STUB));

      await test.step('THEN the bar titles app and counts the payload', async (): Promise<void> => {
        await graphModules.expectBarText('Modules of app');
        await graphModules.expectBarText('6 files · 6 imports · 2 unresolved');
      });

      await test.step('AND the D9 view is drawn', async (): Promise<void> => {
        await graphModules.expectIds(D9_IDS);
        await graphModules.expectEdges(D9_EDGES);
      });
    }
  );

  test(
    'GIVEN app picked in the package graph, Show modules in its "…" menu asks once and draws the D9 view',
    { annotation: MODULES },
    async ({ graphHost, graphList, graphMenus, graphModules, graphModulesHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the package graph is drawn and app is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphList.pick('app');
      });

      await test.step('AND Show modules is chosen from its "…" menu', async (): Promise<void> => {
        await graphMenus.openPackageMenu('app');
        await graphMenus.item(SHOW_MODULES_LABEL).click();
      });

      await test.step('THEN the page asks for app once', async (): Promise<void> => graphModulesHost.expectModulesAsked('app', 1));

      await test.step('AND the graph container has focus, the package toolbar being hidden in modules mode', async (): Promise<void> =>
        graphPage.expectContainerFocused());

      await test.step("WHEN the host answers with app's modules", async (): Promise<void> =>
        graphModulesHost.answerModules(MODULES_APP_STUB));

      await test.step('THEN the D9 view is drawn', async (): Promise<void> => graphModules.expectIds(D9_IDS));
    }
  );

  test(
    'GIVEN a drawn package graph, a host showModules for app enters modules mode and asks once',
    { annotation: MODULES },
    async ({ graphHost, graphModules, graphModulesHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the package graph is drawn', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
      });

      await test.step('AND the host sends showModules for app', async (): Promise<void> => graphModulesHost.sendShowModules('app'));

      await test.step('THEN the page asks for app once', async (): Promise<void> => graphModulesHost.expectModulesAsked('app', 1));

      await test.step('WHEN the host answers', async (): Promise<void> => graphModulesHost.answerModules(MODULES_APP_STUB));

      await test.step('THEN the D9 view is drawn', async (): Promise<void> => graphModules.expectIds(D9_IDS));
    }
  );

  test(
    'GIVEN no package state yet, a host showModules waits and asks only once the first graph state arrives',
    { annotation: MODULES },
    async ({ graphHost, graphModules, graphModulesHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page opens and the host sends showModules for app first', async (): Promise<void> => {
        await graphPage.open();
        await graphModulesHost.sendShowModules('app');
      });

      await test.step('THEN the bar reads Scanning app…', async (): Promise<void> => graphModules.expectBarText('Scanning app…'));

      await test.step('AND the page has not asked yet', async (): Promise<void> => graphModulesHost.expectModulesAsked('app', 0));

      await test.step('WHEN the first package state arrives', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('THEN the page asks for app once', async (): Promise<void> => graphModulesHost.expectModulesAsked('app', 1));

      await test.step('WHEN the host answers', async (): Promise<void> => graphModulesHost.answerModules(MODULES_APP_STUB));

      await test.step('THEN the D9 view is drawn', async (): Promise<void> => graphModules.expectIds(D9_IDS));
    }
  );

  test(
    'GIVEN the D9 view, tapping views expands it in place keeping its centre, and tapping its box title collapses it',
    { annotation: MODULES },
    async ({ graphCanvas, graphModules, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9', async (): Promise<void> => shownModules());

      const before = await graphModules.renderedCentre('dir:src/views');

      await test.step('AND the views card is tapped', async (): Promise<void> => graphCanvas.tapNode('dir:src/views'));

      await test.step('THEN views opens into its three files and their links', async (): Promise<void> => {
        await graphModules.expectIds(VIEWS_IDS);
        await graphModules.expectEdges(VIEWS_EDGES);
      });

      await test.step('AND the views box keeps its centre on screen', async (): Promise<void> =>
        graphModules.expectCentreAt('dir:src/views', before));

      await test.step("WHEN the views box's title is tapped", async (): Promise<void> => graphModules.tapBoxTitle('dir:src/views'));

      await test.step('THEN the D9 view is back', async (): Promise<void> => {
        await graphModules.expectIds(D9_IDS);
        await graphModules.expectEdges(D9_EDGES);
      });
    }
  );

  for (const { label, isChecked, change, ids, edges } of TOGGLES) {
    const start = isChecked ? 'checked' : 'unchecked';

    test(
      `GIVEN views expanded, flipping ${label} from ${start} ${change} and leaves pan and zoom as they were`,
      { annotation: MODULES },
      async ({ graphCanvas, graphModules, shownModules }): Promise<void> => {
        await test.step('WHEN app is shown and views is expanded', async (): Promise<void> => {
          await shownModules();
          await graphCanvas.tapNode('dir:src/views');
          await graphModules.expectEdges(VIEWS_EDGES);
        });

        await test.step(`THEN ${label} starts ${start}`, async (): Promise<void> => graphModules.expectChecked(label, isChecked));

        const camera = await graphModules.camera();

        await test.step(`WHEN ${label} is flipped`, async (): Promise<void> => graphModules.setShown(label, !isChecked));

        await test.step(`THEN it ${change}`, async (): Promise<void> => {
          await graphModules.expectIds(ids);
          await graphModules.expectEdges(edges);
        });

        await test.step('AND pan and zoom are as they were', async (): Promise<void> => graphModules.expectCamera(camera));

        await test.step(`WHEN ${label} is flipped back`, async (): Promise<void> => graphModules.setShown(label, isChecked));

        await test.step('THEN views is drawn as it opened', async (): Promise<void> => {
          await graphModules.expectIds(VIEWS_IDS);
          await graphModules.expectEdges(VIEWS_EDGES);
        });
      }
    );
  }

  test(
    'GIVEN views expanded and zoomed, Reset view returns to the D9 view and fits it',
    { annotation: MODULES },
    async ({ graphCanvas, graphModules, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown, views is expanded and the canvas zoomed in', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('dir:src/views');
        await graphModules.expectIds(VIEWS_IDS);
        await graphCanvas.zoomBy(-500);
        await graphCanvas.expectNodeOutOfView();
      });

      await test.step('AND Reset view is pressed', async (): Promise<void> => graphModules.pressReset());

      await test.step('THEN the D9 view is drawn', async (): Promise<void> => graphModules.expectIds(D9_IDS));

      await test.step('AND every node is in view', async (): Promise<void> => graphCanvas.expectAllNodesInView());
    }
  );

  test(
    'GIVEN Test files checked and views expanded, Reset view leaves Test files checked',
    { annotation: MODULES },
    async ({ graphCanvas, graphModules, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown, Test files is checked and views is expanded', async (): Promise<void> => {
        await shownModules();
        await graphModules.setShown(TESTS_LABEL, true);
        await graphCanvas.tapNode('dir:src/views');
        await graphModules.expectIds(VIEWS_TESTS_IDS);
      });

      await test.step('AND Reset view is pressed', async (): Promise<void> => graphModules.pressReset());

      await test.step('THEN the D9 view is drawn', async (): Promise<void> => graphModules.expectIds(D9_IDS));

      await test.step('AND Test files is still checked', async (): Promise<void> => graphModules.expectChecked(TESTS_LABEL, true));

      await test.step('WHEN views is expanded again', async (): Promise<void> => graphCanvas.tapNode('dir:src/views'));

      await test.step('THEN main.spec.ts is drawn with it', async (): Promise<void> => graphModules.expectIds(VIEWS_TESTS_IDS));
    }
  );

  test(
    'GIVEN the D9 view, double-clicking index.ts posts one openImport at line 0',
    { annotation: MODULES },
    async ({ graphCanvas, graphModulesHost, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9', async (): Promise<void> => shownModules());

      await test.step('AND index.ts is double-clicked', async (): Promise<void> => graphCanvas.doubleTapNode('file:index.ts'));

      await test.step('THEN one openImport for index.ts at line 0 is posted', async (): Promise<void> =>
        graphModulesHost.expectOpenImportPosted([OPEN_INDEX]));
    }
  );

  test(
    'GIVEN the D9 view, double-clicking the lib stub enters lib modules and asks for lib',
    { annotation: MODULES },
    async ({ graphCanvas, graphModules, graphModulesHost, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9', async (): Promise<void> => shownModules());

      await test.step('AND the lib stub is double-clicked', async (): Promise<void> => graphCanvas.doubleTapNode('pkg:lib'));

      await test.step('THEN the page asks for lib once', async (): Promise<void> => graphModulesHost.expectModulesAsked('lib', 1));

      await test.step('AND the bar reads Scanning lib…', async (): Promise<void> => graphModules.expectBarText('Scanning lib…'));
    }
  );

  test(
    'GIVEN the D9 view, the Controls and Details toggles and the Details sash are hidden, and Back returns to the package graph',
    { annotation: MODULES },
    async ({ graphModules, graphProbe, graphSashes, graphTask, graphToolbar, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9 from the open Details panel', async (): Promise<void> => shownModules());

      await test.step('THEN the Controls and Details toggles are hidden', async (): Promise<void> =>
        graphToolbar.expectPanelToggles(false));

      await test.step('AND the Details sash is hidden', async (): Promise<void> => graphSashes.expectShown('details', false));

      await test.step('WHEN Back is pressed', async (): Promise<void> => graphModules.pressBar(BACK_LABEL));

      await test.step('THEN the package graph is drawn', async (): Promise<void> => graphProbe.expectNodeIds(PACKAGES));

      await test.step('AND Packages is the pressed mode', async (): Promise<void> => graphTask.expectPressed(false));

      await test.step('AND the modules bar is hidden', async (): Promise<void> => expect(graphModules.bar).toBeHidden());

      await test.step('AND the Controls and Details toggles show again', async (): Promise<void> =>
        graphToolbar.expectPanelToggles(true));

      await test.step('AND the Details sash shows beside the open panel again', async (): Promise<void> =>
        graphSashes.expectShown('details', true));
    }
  );
});
