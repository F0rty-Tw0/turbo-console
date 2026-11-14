import type { ThemeStub } from './common/graph-theme.type.ts';
import { test } from './graph-task.fixture.ts';
import { THEME_DARK_2026_STUB, THEME_LIGHT_2026_STUB } from './test/stubs/graph-theme-2026.stub.ts';
import { THEME_DARK_STUB, THEME_HC_STUB, THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';

const F4 = { description: 'G2-5a spec F4', type: 'requirement' };

type ThemeCase = {
  readonly name: string;
  readonly theme: ThemeStub;
};

const THEMES: ThemeCase[] = [
  { name: 'dark', theme: THEME_DARK_STUB },
  { name: 'light', theme: THEME_LIGHT_STUB },
  { name: 'high contrast', theme: THEME_HC_STUB },
  { name: 'Dark 2026', theme: THEME_DARK_2026_STUB },
  { name: 'Light 2026', theme: THEME_LIGHT_2026_STUB }
];

test.describe('FEATURE: task card colours', () => {
  for (const { name, theme } of THEMES) {
    test(
      `GIVEN the ${name} theme, an idle task card is filled with the input background and framed by the input border`,
      { annotation: F4 },
      async ({ graphGlyphs, graphLook }): Promise<void> => {
        await test.step('WHEN the chosen task graph is opened', async (): Promise<void> => graphGlyphs.openChosen());

        await test.step(`AND the ${name} theme is applied`, async (): Promise<void> => graphLook.applyTheme(theme));

        await test.step('THEN the idle card app#build is filled with input.background and framed by input.border', async (): Promise<void> => {
          const { cardFill, cardFrame, label } = theme.expected;

          await graphLook.expectNodeColors('app#build', { fill: cardFill, label, frame: cardFrame });
        });
      }
    );
  }
});
