import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { INPUT_OPTION_STUB } from './test/stubs/graph-details.stub.ts';
import { THEME_HC_STUB } from './test/stubs/graph-theme.stub.ts';

const D4 = { description: '2026-10-27-u3-controls-nav D4', type: 'requirement' };

const TO_FOCUS_DOCS: FocusStep[] = [
  { key: 'ArrowDown', focus: 'docs' },
  { key: 'ArrowRight', focus: 'Focus docs' }
];

const TO_FOCUS_APPS: FocusStep[] = [
  { key: 'ArrowRight', focus: 'Collapse folder apps' },
  { key: 'ArrowRight', focus: 'Focus folder apps' }
];

test.describe('FEATURE: graph controls sections and Focus toggles', () => {
  test(
    'GIVEN the controls graph, a row Focus toggle is see-through, unpressed and titled for focusing at rest',
    { annotation: D4 },
    async ({ graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN Focus docs is drawn at opacity 0', async (): Promise<void> => graphList.expectFocusOpacity('docs', '0'));

      await test.step('AND it is unpressed and titled for focusing', async (): Promise<void> =>
        graphList.expectFocusPressed('docs', false));
    }
  );

  test(
    'GIVEN the controls graph, the arrow keys reach a row Focus toggle, which shows on keyboard focus and stays shown while pressed',
    { annotation: D4 },
    async ({ graphCamera, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the list is reached by Tab', async (): Promise<void> => graphKeys.tabTo('(root) (1)'));

      const walked = await test.step('AND Down and Right are pressed', async (): Promise<FocusStep[]> =>
        graphKeys.walk(TO_FOCUS_DOCS));

      await test.step('THEN focus reaches Focus docs', (): void => expect(walked).toEqual(TO_FOCUS_DOCS));

      await test.step('AND Focus docs is shown and unpressed', async (): Promise<void> => {
        await graphList.expectFocusOpacity('docs', '1');
        await graphList.expectFocusPressed('docs', false);
      });

      await test.step('WHEN Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN Focus docs is pressed and titled Clear focus', async (): Promise<void> =>
        graphList.expectFocusPressed('docs', true));

      await test.step('AND only docs is visible', async (): Promise<void> => graphCamera.expectVisible(['docs']));

      await test.step('WHEN the pointer moves away and Tab leaves the list', async (): Promise<void> => {
        await graphList.moveMouseAway();
        await graphPage.pressKey('Tab');
      });

      await test.step('THEN Focus docs is still shown', async (): Promise<void> => graphList.expectFocusOpacity('docs', '1'));

      await test.step('WHEN Focus docs is pressed again', async (): Promise<void> => graphList.focusOn('docs'));

      await test.step('THEN it is unpressed', async (): Promise<void> => graphList.expectFocusPressed('docs', false));
    }
  );

  test(
    'GIVEN the controls graph, hovering a row shows its Focus toggle and leaving it hides the toggle again',
    { annotation: D4 },
    async ({ graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the web row is hovered', async (): Promise<void> => graphList.hoverRow('web'));

      await test.step('THEN Focus web is shown', async (): Promise<void> => graphList.expectFocusOpacity('web', '1'));

      await test.step('WHEN the pointer moves away', async (): Promise<void> => graphList.moveMouseAway());

      await test.step('THEN Focus web is see-through again', async (): Promise<void> => graphList.expectFocusOpacity('web', '0'));
    }
  );

  test(
    'GIVEN theme input-option colours, a pressed row Focus toggle keeps the pressed fill under hover and gains the ring in high contrast',
    { annotation: D4 },
    async ({ graphHost, graphList, graphLook, graphPage, graphToolbar }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND the input-option colours are set', async (): Promise<void> =>
        graphToolbar.setInputOptionVars(INPUT_OPTION_STUB));

      await test.step('AND Focus docs is pressed, which leaves the pointer on it', async (): Promise<void> =>
        graphList.focusOn('docs'));

      await test.step('THEN Focus docs is drawn pressed while hovered', async (): Promise<void> =>
        graphToolbar.expectIconPressed(graphList.focusButton('docs'), true));

      await test.step('WHEN Focus web is hovered', async (): Promise<void> => graphList.hoverFocus('web'));

      await test.step('THEN Focus web is not drawn pressed', async (): Promise<void> =>
        graphToolbar.expectIconPressed(graphList.focusButton('web'), false));

      await test.step('AND Focus docs is still drawn pressed', async (): Promise<void> =>
        graphToolbar.expectIconPressed(graphList.focusButton('docs'), true));

      await test.step('WHEN the high contrast theme applies', async (): Promise<void> => graphLook.applyTheme(THEME_HC_STUB));

      await test.step('THEN Focus docs has the inner ring', async (): Promise<void> =>
        graphToolbar.expectIconRing(graphList.focusButton('docs')));
    }
  );

  test(
    'GIVEN the grouped controls graph, the folder header chevron waits for the folder layout and the header Focus toggle shows on hover or keyboard focus and is pressed under a constant name',
    { annotation: D4 },
    async ({ graphFolderInspect, graphFolders, graphGrouping, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened with held workers', async (): Promise<void> => graphPage.open({ workers: 'held' }));

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN no header shows Collapse or Expand while the folder layout runs', async (): Promise<void> =>
        graphList.expectNoFolderToggles());

      await test.step('WHEN the held worker is released', async (): Promise<void> => graphGrouping.releaseWorker());

      await test.step('AND the folder layout is drawn', async (): Promise<void> => graphGrouping.expectBoxesInView(3));

      await test.step('THEN Focus folder apps is see-through and unpressed', async (): Promise<void> => {
        await graphFolderInspect.expectHeaderFocusOpacity('apps', '0');
        await graphFolderInspect.expectHeaderFocusText('apps', 'Focus');
      });

      await test.step('WHEN the apps header is hovered', async (): Promise<void> => graphFolderInspect.hoverHeader('apps'));

      await test.step('THEN Focus folder apps is shown', async (): Promise<void> =>
        graphFolderInspect.expectHeaderFocusOpacity('apps', '1'));

      await test.step('WHEN the pointer moves away', async (): Promise<void> => graphList.moveMouseAway());

      await test.step('THEN Focus folder apps is see-through again', async (): Promise<void> =>
        graphFolderInspect.expectHeaderFocusOpacity('apps', '0'));

      const walked = await test.step('WHEN the apps header is reached by Tab and Down, then Right twice', async (): Promise<
        FocusStep[]
      > => {
        await graphKeys.tabTo('(root) (1)');
        await graphKeys.arrowTo('apps (2)');

        return graphKeys.walk(TO_FOCUS_APPS);
      });

      await test.step('THEN focus reaches Focus folder apps', (): void => expect(walked).toEqual(TO_FOCUS_APPS));

      await test.step('AND Focus folder apps is shown', async (): Promise<void> =>
        graphFolderInspect.expectHeaderFocusOpacity('apps', '1'));

      await test.step('WHEN Collapse folder apps is pressed', async (): Promise<void> => graphFolders.toggleInList('apps', true));

      await test.step('THEN the header reads Expand folder apps with the right chevron', async (): Promise<void> =>
        graphFolders.expectListToggle('apps', false));

      await test.step('AND Focus folder apps is still unpressed', async (): Promise<void> =>
        graphFolderInspect.expectHeaderFocusText('apps', 'Focus'));

      await test.step('WHEN Focus folder apps is pressed', async (): Promise<void> => graphFolderInspect.pressHeaderFocus('apps'));

      await test.step('THEN it is pressed, keeps its name and is titled Clear focus', async (): Promise<void> => {
        await graphFolderInspect.expectHeaderFocusText('apps', 'Clear focus');
        await graphFolderInspect.expectHeaderFocusTitled('apps', 'Clear focus');
      });
    }
  );

  test(
    'GIVEN the controls graph, the panel is split into the Search, View and Packages sections',
    { annotation: D4 },
    async ({ graphControls, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the panel headings read Search, View and Packages', async (): Promise<void> =>
        graphControls.expectSectionTitles(['Search', 'View', 'Packages']));
    }
  );

  test(
    'GIVEN the controls graph, Show all is hidden until a filter is on, counts what it brings back and hands focus to the list once pressed',
    { annotation: D4 },
    async ({ graphControls, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN Show all is hidden', async (): Promise<void> => graphControls.expectShowAllDisabled(true));

      await test.step('WHEN docs is unticked', async (): Promise<void> => graphList.uncheckWithoutFocus('docs'));

      await test.step('THEN Show all reads Show all (1 hidden)', async (): Promise<void> =>
        graphControls.expectShowAllText('Show all (1 hidden)'));

      await test.step('WHEN web is unticked too', async (): Promise<void> => graphList.uncheckWithoutFocus('web'));

      await test.step('THEN Show all reads Show all (2 hidden)', async (): Promise<void> =>
        graphControls.expectShowAllText('Show all (2 hidden)'));

      await test.step('WHEN Show all is reached by Tab', async (): Promise<void> => graphKeys.tabTo('Show all (2 hidden)'));

      await test.step('AND Space is pressed', async (): Promise<void> => graphPage.pressKey('Space'));

      await test.step('THEN the first group checkbox of the list holds focus', async (): Promise<void> =>
        graphKeys.expectFocusedName('(root) (1)'));

      await test.step('AND the list is still a single Tab stop', async (): Promise<void> => graphKeys.expectListTabStops(1));

      await test.step('AND Show all is hidden again', async (): Promise<void> => graphControls.expectShowAllDisabled(true));
    }
  );
});
