import { expect, test } from './graph.fixture.ts';
import { GraphModulesShots } from './pages/graph-modules-shots.po.ts';
import { THEME_DARK_STUB, THEME_HC_STUB, THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';

const THEMES = [
  { name: 'dark', theme: THEME_DARK_STUB },
  { name: 'light', theme: THEME_LIGHT_STUB },
  { name: 'high-contrast', theme: THEME_HC_STUB }
] as const;

test.describe('FEATURE: theme screenshots of the package modules view', () => {
  for (const { name, theme } of THEMES) {
    test(`GIVEN the ${name} theme, app's modules with views expanded match modules-${name}.png`, async ({ page }): Promise<void> => {
      const shots = new GraphModulesShots(page);

      await test.step('WHEN app opens in modules mode with views expanded', async (): Promise<void> => shots.openModules(theme));

      await test.step(`THEN the page matches modules-${name}.png`, async (): Promise<void> =>
        expect(page).toHaveScreenshot(`modules-${name}.png`));
    });
  }
});
