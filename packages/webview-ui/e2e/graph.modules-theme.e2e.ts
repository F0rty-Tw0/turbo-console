import { test } from './graph-modules.fixture.ts';
import { THEME_HC_STUB } from './test/stubs/graph-theme.stub.ts';
import { MODULE_LAZIES_LABEL, MODULE_TESTS_LABEL, MODULE_TYPES_LABEL } from '../src/graph/common/graph-module.const.ts';

const MODULES = { description: '2026-11-22-package-modules-graph spec 7.4', type: 'requirement' };

const VIEW_LABELS = [MODULE_TYPES_LABEL, MODULE_TESTS_LABEL, MODULE_LAZIES_LABEL];

/** High Contrast's `checkbox.border`: the contrast border, `#6fc3df`. */
const CONTRAST_FRAME = 'rgb(111, 195, 223)';

test.describe('FEATURE: package modules bar under the high contrast theme', () => {
  for (const label of VIEW_LABELS) {
    test(
      `GIVEN the high contrast theme, the ${label} View checkbox is framed in the contrast border`,
      { annotation: MODULES },
      async ({ graphLook, graphModules, shownModules }): Promise<void> => {
        await test.step('WHEN app is shown in modules mode', async (): Promise<void> => shownModules());

        await test.step('AND the high contrast theme applies', async (): Promise<void> => graphLook.applyTheme(THEME_HC_STUB));

        await test.step('THEN the checkbox frame is the contrast border', async (): Promise<void> =>
          graphModules.expectCheckFrame(label, CONTRAST_FRAME));
      }
    );
  }
});
