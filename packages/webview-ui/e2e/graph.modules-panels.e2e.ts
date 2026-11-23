import {
  IMPORTED_BY_HEADING,
  IMPORTS_HEADING,
  INDEX_IMPORTS,
  LIB_IMPORTED_BY,
  LINK_IMPORTS,
  MAIN_IMPORTED_BY,
  MAIN_IMPORTS,
  MODULE_CONTROLS_ID,
  MODULE_DETAILS_ID
} from './common/graph-module-panels.const.ts';
import { BACK_LABEL, D9_IDS, VIEWS_IDS } from './common/graph-modules.const.ts';
import { test } from './graph-modules.fixture.ts';
import {
  INDEX_ASK_STUB,
  INDEX_SITES_STUB,
  LIB_ASK_STUB,
  LIB_SITES_STUB,
  LINK_ASK_STUB,
  LINK_SITES_STUB,
  MAIN_ASK_STUB,
  MAIN_SITES_STUB
} from './test/stubs/graph-module-sites.stub.ts';
import { MODULES_APP_STUB } from './test/stubs/graph-modules.stub.ts';
import { SINGLE_PACKAGE_TASKS_STUB } from './test/stubs/graph-single-package.stub.ts';
import type { GraphOpenImportMessage } from '../src/bridge/common/graph-imports.type.ts';

const PANELS = { description: '2026-11-22-modules-panels spec 10.1', type: 'requirement' };

const OPEN_INDEX: GraphOpenImportMessage = { type: 'openImport', packageName: 'app', file: 'index.ts', line: 0 };

test.describe('FEATURE: package modules panels', () => {
  test(
    'GIVEN app shown in modules mode, the toggles open and close the module asides, each with its sash (AC 1, 2, 14)',
    { annotation: PANELS },
    async ({ graphModulePanels, graphModules, graphSashes, graphToolbar, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9', async (): Promise<void> => shownModules());

      await test.step('THEN the Panels toggles show and point at the module asides', async (): Promise<void> => {
        await graphToolbar.expectPanelToggles(true);
        await graphModulePanels.expectToggleTargets(MODULE_CONTROLS_ID, MODULE_DETAILS_ID);
      });

      await test.step('AND both module asides are open, each with its sash', async (): Promise<void> => {
        await graphModulePanels.expectOpen('controls', true);
        await graphModulePanels.expectOpen('details', true);
        await graphSashes.expectShown('controls', true);
        await graphSashes.expectShown('details', true);
        await graphSashes.expectControls('controls', MODULE_CONTROLS_ID);
        await graphSashes.expectControls('details', MODULE_DETAILS_ID);
      });

      await test.step("AND none of the package graph's own parts shows", async (): Promise<void> =>
        graphModulePanels.expectPackagePartsHidden());

      await test.step('WHEN Details is toggled', async (): Promise<void> => graphModulePanels.toggle('Details'));

      await test.step('THEN Details and its sash close and Controls keeps its sash', async (): Promise<void> => {
        await graphModulePanels.expectOpen('details', false);
        await graphSashes.expectShown('details', false);
        await graphSashes.expectShown('controls', true);
      });

      await test.step('WHEN Details is toggled again', async (): Promise<void> => graphModulePanels.toggle('Details'));

      await test.step('THEN Details and its sash show again', async (): Promise<void> => {
        await graphModulePanels.expectOpen('details', true);
        await graphSashes.expectShown('details', true);
      });

      await test.step('WHEN Controls is toggled', async (): Promise<void> => graphModulePanels.toggle('Controls'));

      await test.step('THEN Controls and its sash close', async (): Promise<void> => {
        await graphModulePanels.expectOpen('controls', false);
        await graphSashes.expectShown('controls', false);
      });

      await test.step('WHEN Back is pressed', async (): Promise<void> => graphModules.pressBar(BACK_LABEL));

      await test.step('THEN the toggles point at the package asides and both module asides are hidden', async (): Promise<void> => {
        await graphModulePanels.expectToggleTargets('graph-controls', 'graph-details');
        await graphModulePanels.expectOpen('controls', false);
        await graphModulePanels.expectOpen('details', false);
      });
    }
  );

  test(
    'GIVEN a single-package repo, Back from modules mode points the toggles at the task panels (AC 1)',
    { annotation: PANELS },
    async ({ graphHost, graphModulePanels, graphModules, graphModulesHost, graphPage, graphSinglePackage }): Promise<void> => {
      await test.step('WHEN the single-package state is drawn in task mode', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
        await graphSinglePackage.expectTaskMode();
      });

      await test.step("AND Show modules is pressed and the host answers with //'s modules", async (): Promise<void> => {
        await graphModules.pressShowModules();
        await graphModulesHost.answerModules(MODULES_APP_STUB);
        await graphModules.expectIds(D9_IDS);
      });

      await test.step('THEN the toggles point at the module asides', async (): Promise<void> =>
        graphModulePanels.expectToggleTargets(MODULE_CONTROLS_ID, MODULE_DETAILS_ID));

      await test.step('WHEN Back is pressed', async (): Promise<void> => graphModules.pressBar(BACK_LABEL));

      await test.step('THEN task mode is back and the toggles point at the task asides', async (): Promise<void> => {
        await graphSinglePackage.expectTaskMode();
        await graphModulePanels.expectToggleTargets('graph-task-controls', 'graph-task-details');
      });
    }
  );

  test(
    'GIVEN views expanded, tapping main.ts lists its Imports by target and its Imported by by file, and a row opens its line (AC 3)',
    { annotation: PANELS },
    async ({ graphCanvas, graphModuleDetails, graphModuleSitesHost, graphModules, graphModulesHost, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9 and views is tapped open', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('dir:src/views');
        await graphModules.expectIds(VIEWS_IDS);
      });

      await test.step('AND main.ts is tapped', async (): Promise<void> => graphCanvas.tapNode('file:src/views/main.ts'));

      await test.step('THEN the page asks for main.ts once, titles it and paints it selected', async (): Promise<void> => {
        await graphModuleSitesHost.expectSitesAsked([MAIN_ASK_STUB]);
        await graphModuleDetails.expectTitle('src/views/main.ts');
        await graphModules.expectState('file:src/views/main.ts', 'selected');
      });

      await test.step("WHEN the host answers with main.ts' sites", async (): Promise<void> =>
        graphModuleSitesHost.answerSites(MAIN_ASK_STUB, MAIN_SITES_STUB));

      await test.step('THEN Details shows Imports and Imported by, and Focus', async (): Promise<void> => {
        await graphModuleDetails.expectBlocks([IMPORTS_HEADING, IMPORTED_BY_HEADING]);
        await graphModuleDetails.expectFocusButton('Focus');
      });

      await test.step('AND Imports groups by target and Imported by by importing file', async (): Promise<void> => {
        await graphModuleDetails.expectGroups(IMPORTS_HEADING, MAIN_IMPORTS);
        await graphModuleDetails.expectGroups(IMPORTED_BY_HEADING, MAIN_IMPORTED_BY);
      });

      await test.step("WHEN index.ts' Imported by row is clicked", async (): Promise<void> =>
        graphModuleDetails.openRow(IMPORTED_BY_HEADING, 'index.ts', 1));

      await test.step('THEN one openImport for index.ts at line 0 is posted', async (): Promise<void> =>
        graphModulesHost.expectOpenImportPosted([OPEN_INDEX]));
    }
  );

  test(
    'GIVEN the D9 view, tapping the views → model link between two folder cards lists the imports it merges (AC 4)',
    { annotation: PANELS },
    async ({ graphLink, graphModuleDetails, graphModuleSitesHost, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9 and the views → model link is tapped', async (): Promise<void> => {
        await shownModules();
        await graphLink.tapLink('dir:src/views', 'dir:src/model');
      });

      await test.step('THEN the page asks for the link once and titles it', async (): Promise<void> => {
        await graphModuleSitesHost.expectSitesAsked([LINK_ASK_STUB]);
        await graphModuleDetails.expectTitle('src/views/ → src/model/');
      });

      await test.step("WHEN the host answers with the link's sites", async (): Promise<void> =>
        graphModuleSitesHost.answerSites(LINK_ASK_STUB, LINK_SITES_STUB));

      await test.step('THEN only Imports shows, grouped by importing file', async (): Promise<void> => {
        await graphModuleDetails.expectBlocks([IMPORTS_HEADING]);
        await graphModuleDetails.expectGroups(IMPORTS_HEADING, LINK_IMPORTS);
      });
    }
  );

  test(
    'GIVEN the D9 view, tapping the lib stub lists every line that imports lib (AC 4)',
    { annotation: PANELS },
    async ({ graphCanvas, graphModuleDetails, graphModuleSitesHost, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9 and the lib stub is tapped', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('pkg:lib');
      });

      await test.step('THEN the page asks for lib once and titles it', async (): Promise<void> => {
        await graphModuleSitesHost.expectSitesAsked([LIB_ASK_STUB]);
        await graphModuleDetails.expectTitle('lib');
      });

      await test.step("WHEN the host answers with lib's sites", async (): Promise<void> =>
        graphModuleSitesHost.answerSites(LIB_ASK_STUB, LIB_SITES_STUB));

      await test.step('THEN only Imported by shows, with Focus', async (): Promise<void> => {
        await graphModuleDetails.expectBlocks([IMPORTED_BY_HEADING]);
        await graphModuleDetails.expectFocusButton('Focus');
        await graphModuleDetails.expectGroups(IMPORTED_BY_HEADING, LIB_IMPORTED_BY);
      });
    }
  );

  test(
    'GIVEN a file shown in Details, a background tap and Clear selection each show the empty hint and ask nothing (AC 6)',
    { annotation: PANELS },
    async ({
      graphCanvas,
      graphDetailsBar,
      graphModuleDetails,
      graphModuleSitesHost,
      graphModulesHost,
      shownModules
    }): Promise<void> => {
      await test.step('WHEN index.ts is tapped and its sites arrive', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('file:index.ts');
        await graphModuleSitesHost.answerSites(INDEX_ASK_STUB, INDEX_SITES_STUB);
        await graphModuleDetails.expectRowCount(1);
      });

      await test.step('AND the background is tapped', async (): Promise<void> => graphCanvas.tapBackground());

      await test.step('THEN Details shows the empty hint, nothing more is asked and no selection is saved', async (): Promise<void> => {
        await graphModuleDetails.expectEmpty();
        await graphModuleSitesHost.expectSitesAsked([INDEX_ASK_STUB]);
        await graphModulesHost.expectModulesSaved({ selected: null });
      });

      await test.step('WHEN the lib stub is tapped', async (): Promise<void> => graphCanvas.tapNode('pkg:lib'));

      await test.step('THEN the page asks for lib and titles it', async (): Promise<void> => {
        await graphModuleSitesHost.expectSitesAsked([INDEX_ASK_STUB, LIB_ASK_STUB]);
        await graphModuleDetails.expectTitle('lib');
      });

      await test.step('WHEN Clear selection is pressed', async (): Promise<void> => graphDetailsBar.pressClear());

      await test.step('THEN Details shows the empty hint, nothing more is asked and no selection is saved', async (): Promise<void> => {
        await graphModuleDetails.expectEmpty();
        await graphModuleSitesHost.expectSitesAsked([INDEX_ASK_STUB, LIB_ASK_STUB]);
        await graphModulesHost.expectModulesSaved({ selected: null });
      });
    }
  );

  test(
    "GIVEN lib then index.ts tapped, lib's late reply is never shown and index.ts's is (AC 7)",
    { annotation: PANELS },
    async ({ graphCanvas, graphModuleDetails, graphModuleSitesHost, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9 and lib is tapped', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('pkg:lib');
        await graphModuleSitesHost.expectSitesAsked([LIB_ASK_STUB]);
        await graphModuleDetails.expectTitle('lib');
      });

      await test.step('AND index.ts is tapped before lib is answered', async (): Promise<void> => {
        await graphCanvas.tapNode('file:index.ts');
        await graphModuleSitesHost.expectSitesAsked([LIB_ASK_STUB, INDEX_ASK_STUB]);
        await graphModuleDetails.expectTitle('index.ts');
      });

      await test.step("WHEN lib's reply arrives late", async (): Promise<void> =>
        graphModuleSitesHost.answerSites(LIB_ASK_STUB, LIB_SITES_STUB));

      await test.step('THEN Details still shows index.ts with no row', async (): Promise<void> => {
        await graphModuleDetails.expectTitle('index.ts');
        await graphModuleDetails.expectRowCount(0);
      });

      await test.step("WHEN index.ts' reply arrives", async (): Promise<void> =>
        graphModuleSitesHost.answerSites(INDEX_ASK_STUB, INDEX_SITES_STUB));

      await test.step("THEN Details lists index.ts' one import", async (): Promise<void> => {
        await graphModuleDetails.expectGroups(IMPORTS_HEADING, INDEX_IMPORTS);
        await graphModuleDetails.expectRowCount(1);
      });
    }
  );
});
