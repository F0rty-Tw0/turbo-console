import {
  FOCUS_1_EDGES,
  FOCUS_1_IDS,
  FOCUS_2_EDGES,
  FOCUS_2_IDS,
  IMPORTS_HEADING,
  INDEX_IMPORTS,
  NO_FOCUS_TEXT
} from './common/graph-module-panels.const.ts';
import { VIEWS_EDGES, VIEWS_IDS } from './common/graph-modules.const.ts';
import { expect, test } from './graph-modules.fixture.ts';
import { INDEX_ASK_STUB, INDEX_SITES_STUB } from './test/stubs/graph-module-sites.stub.ts';
import { MODULES_APP_STUB } from './test/stubs/graph-modules.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import type { ModuleSelection } from '../src/bridge/common/graph-view-state.type.ts';

const FOCUS = { description: '2026-11-22-modules-panels spec 10.1', type: 'requirement' };

const INDEX_SELECTED: ModuleSelection = { kind: 'node', id: 'file:index.ts' };

test.describe('FEATURE: package modules focus', () => {
  test(
    'GIVEN views expanded and index.ts selected, Focus draws depth 1, depth 2 adds the next ring, and Clear focus restores views (AC 8)',
    { annotation: FOCUS },
    async ({
      graphCanvas,
      graphModuleDetails,
      graphModulePanels,
      graphModuleSitesHost,
      graphModules,
      graphModulesHost,
      shownModules
    }): Promise<void> => {
      await test.step('WHEN index.ts is selected and views is tapped open', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('file:index.ts');
        await graphModuleSitesHost.answerSites(INDEX_ASK_STUB, INDEX_SITES_STUB);
        await graphCanvas.tapNode('dir:src/views');
        await graphModules.expectIds(VIEWS_IDS);
        await graphModules.expectState('file:index.ts', 'selected');
      });

      await test.step('THEN Controls shows no focus at depth 1', async (): Promise<void> => {
        await graphModulePanels.expectFocusText(NO_FOCUS_TEXT);
        await graphModulePanels.expectClearFocusShown(false);
        await graphModulePanels.expectDepth(1);
      });

      await test.step('WHEN Focus is pressed in Details', async (): Promise<void> => graphModuleDetails.pressFocus());

      await test.step('THEN only index.ts and its direct neighbour are drawn, fitted', async (): Promise<void> => {
        await graphModules.expectIds(FOCUS_1_IDS);
        await graphModules.expectEdges(FOCUS_1_EDGES);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('AND Controls names the focus and Details offers Clear focus', async (): Promise<void> => {
        await graphModulePanels.expectFocusText('index.ts');
        await graphModulePanels.expectClearFocusShown(true);
        await graphModuleDetails.expectFocusButton('Clear focus');
      });

      await test.step('AND index.ts stays selected', async (): Promise<void> => graphModules.expectState('file:index.ts', 'selected'));

      await test.step('WHEN Focus depth is set to 2', async (): Promise<void> => graphModulePanels.setDepth(2));

      await test.step('THEN the next ring is drawn too, fitted', async (): Promise<void> => {
        await graphModules.expectIds(FOCUS_2_IDS);
        await graphModules.expectEdges(FOCUS_2_EDGES);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('WHEN Clear focus is pressed in Controls', async (): Promise<void> => graphModulePanels.pressClearFocus());

      await test.step("THEN the user's own expansion is drawn again", async (): Promise<void> => {
        await graphModules.expectIds(VIEWS_IDS);
        await graphModules.expectEdges(VIEWS_EDGES);
      });

      await test.step('AND no focus shows, Details offers Focus, and the depth is kept', async (): Promise<void> => {
        await graphModulePanels.expectFocusText(NO_FOCUS_TEXT);
        await graphModulePanels.expectClearFocusShown(false);
        await graphModuleDetails.expectFocusButton('Focus');
        await graphModulesHost.expectModulesSaved({ focus: null, depth: 2 });
      });
    }
  );

  test(
    'GIVEN a selection, a focus at depth 2 and Controls closed, a reload restores all four and asks for the selection once (AC 10)',
    { annotation: FOCUS },
    async ({
      graphCanvas,
      graphHost,
      graphModuleDetails,
      graphModulePanels,
      graphModuleSitesHost,
      graphModules,
      graphModulesHost,
      shownModules
    }): Promise<void> => {
      await test.step('WHEN index.ts is selected, focused at depth 2 and Controls is closed', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('file:index.ts');
        await graphModuleSitesHost.answerSites(INDEX_ASK_STUB, INDEX_SITES_STUB);
        await graphModuleDetails.pressFocus();
        await graphModulePanels.setDepth(2);
        await graphModulePanels.toggle('Controls');
        await graphModulePanels.expectOpen('controls', false);
      });

      await test.step('THEN the selection, the focus and the depth are saved', async (): Promise<void> =>
        graphModulesHost.expectModulesSaved({ selected: INDEX_SELECTED, focus: 'file:index.ts', depth: 2 }));

      await test.step('WHEN the page reloads and the host answers again', async (): Promise<void> => {
        const saved = await graphHost.reopen();

        expect(saved.mode).toBe('modules');
        expect(saved.controlsOpen).toBe(false);
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphModulesHost.answerModules(MODULES_APP_STUB);
      });

      await test.step('THEN the focus is drawn at depth 2 with index.ts selected', async (): Promise<void> => {
        await graphModules.expectIds(FOCUS_2_IDS);
        await graphModules.expectState('file:index.ts', 'selected');
      });

      await test.step('AND the page asks for index.ts exactly once', async (): Promise<void> =>
        graphModuleSitesHost.expectSitesAsked([INDEX_ASK_STUB]));

      await test.step('AND Controls is closed, Details open, with depth 2 and the focus named', async (): Promise<void> => {
        await graphModulePanels.expectOpen('controls', false);
        await graphModulePanels.expectOpen('details', true);
        await graphModulePanels.expectDepth(2);
        await graphModulePanels.expectFocusText('index.ts');
      });

      await test.step('WHEN Controls is toggled', async (): Promise<void> => graphModulePanels.toggle('Controls'));

      await test.step('THEN Controls opens', async (): Promise<void> => graphModulePanels.expectOpen('controls', true));

      await test.step("WHEN index.ts' sites arrive", async (): Promise<void> =>
        graphModuleSitesHost.answerSites(INDEX_ASK_STUB, INDEX_SITES_STUB));

      await test.step("THEN Details lists index.ts' imports", async (): Promise<void> =>
        graphModuleDetails.expectGroups(IMPORTS_HEADING, INDEX_IMPORTS));
    }
  );
});
