import { expect } from '@playwright/test';

import { test as base } from './graph-routes.fixture.ts';
import { GraphTitleChip } from './pages/graph-title-chip.po.ts';
import { THEME_DARK_STUB, THEME_HC_STUB, THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { channelGapOf, rgbOfHex } from './test/utils/graph-title-chip.spec.util.ts';
import { ALL_EDGE_IDS, GROUPED_SAVED } from './test/utils/graph-u0-routes.spec.util.ts';

type TitleChipFixtures = {
  readonly graphTitleChip: GraphTitleChip;
};

const test = base.extend<TitleChipFixtures>({
  graphTitleChip: async ({ page }, use): Promise<void> => {
    await use(new GraphTitleChip(page));
  }
});

const THEMES = [
  { name: 'dark', theme: THEME_DARK_STUB },
  { name: 'light', theme: THEME_LIGHT_STUB },
  { name: 'high-contrast', theme: THEME_HC_STUB }
] as const;

/** The U0 folder whose title text a package line crosses (Task 4.1 measured three crossings of its text). */
const PACKAGES = 'packages';

/** How far a channel of the chip pixel may sit from the editor background, for anti-aliasing. */
const CHANNEL_TOLERANCE = 8;

const CHIP = { description: 'U6d d4 opaque title chip', type: 'requirement' };

test.describe('FEATURE: the folder title chip', () => {
  for (const { name, theme } of THEMES)
    test(
      `GIVEN the ${name} theme and a line under a folder title's text THEN the title's second pixel row shows the editor background, not the line`,
      { annotation: CHIP },
      async ({ graphCanvas, graphHost, graphLook, graphPage, graphProbe, graphRoutes, graphTitleChip }): Promise<void> => {
        await test.step('GIVEN the U0 workspace grouped in the theme, laid out and framed', async (): Promise<void> => {
          await graphPage.open({ savedState: GROUPED_SAVED });
          await graphLook.applyTheme(theme);
          await graphHost.sendState(U0_STATE_STUB);
          await graphProbe.expectLayoutEngine('elk');
          await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
          await graphPage.pressButton('Fit');
          await graphCanvas.expectAllNodesInView();
        });

        const spot =
          await test.step('WHEN a drawn package line crosses the packages title text (the oracle reads the text rect, not the CSS)', async () =>
            graphTitleChip.spotUnderTitle(PACKAGES));

        await test.step('THEN the pixel on that line equals the theme editor background', async (): Promise<void> => {
          const pixel = await graphTitleChip.pixelAt(spot);
          const background = rgbOfHex(theme.vars['--vscode-editor-background'] ?? '');
          const gap = channelGapOf(pixel, background);

          const description = `${name}: ${pixel.join(',')} vs ${background.join(',')} at ${spot.x},${spot.y}`;
          const annotation = { type: 'chip-pixel', description };

          test.info().annotations.push(annotation);
          expect(gap, `chip pixel ${pixel.join(',')} vs editor background ${background.join(',')}`).toBeLessThanOrEqual(
            CHANNEL_TOLERANCE
          );
        });
      }
    );
});
