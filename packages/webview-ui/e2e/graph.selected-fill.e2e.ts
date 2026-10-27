import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { DIAMOND_CHAIN_CACHED_STUB } from './test/stubs/graph-state.stub.ts';
import {
  THEME_DARK_2026_STUB,
  THEME_DARK_STUB,
  THEME_HC_STUB,
  THEME_LIGHT_2026_STUB,
  THEME_LIGHT_STUB
} from './test/stubs/graph-theme.stub.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';

const D6 = { description: '2026-10-26-u2-quick-wins D6', type: 'requirement' };

const THEMES = [
  ['dark', THEME_DARK_STUB],
  ['light', THEME_LIGHT_STUB],
  ['high contrast', THEME_HC_STUB],
  ['Dark 2026', THEME_DARK_2026_STUB],
  ['Light 2026', THEME_LIGHT_2026_STUB]
] as const;

const FIT_STATES: [string, GraphReady][] = [
  ['the details graph', DETAILS_STUB],
  ['the target-like graph', targetLikeState()]
];

const namesOf = (state: GraphReady): string[] => state.packages.map((pkg): string => pkg.name);

test.describe('FEATURE: selected node fill', () => {
  for (const [name, theme] of THEMES) {
    test(
      `GIVEN the ${name} theme, a selected package fills with the list selection colour, or the editor background without one`,
      { annotation: D6 },
      async ({ graphCanvas, graphHost, graphLook, graphPage, graphSelection }): Promise<void> => {
        await test.step('WHEN the diamond is drawn in the theme', async (): Promise<void> => {
          await graphPage.open();
          await graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB);
          await graphLook.applyTheme(theme);
        });

        await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

        await test.step('THEN the inside of web is the selected fill', async (): Promise<void> =>
          graphSelection.expectFill('web', theme.expected.selectedFill));
      }
    );
  }

  for (const [name, state] of FIT_STATES) {
    test(
      `GIVEN ${name}, every package label drawn bold fits inside its selected border`,
      { annotation: D6 },
      async ({ graphHost, graphPage, graphSelection }): Promise<void> => {
        await test.step('WHEN the graph is drawn', async (): Promise<void> => {
          await graphPage.open();
          await graphHost.sendState(state);
        });

        await test.step('THEN each bold label is no wider than its node less both selected borders', async (): Promise<void> =>
          graphSelection.expectBoldLabelsFit(namesOf(state)));
      }
    );
  }
});
