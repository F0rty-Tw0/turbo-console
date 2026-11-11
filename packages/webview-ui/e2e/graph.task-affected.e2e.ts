import type { RunOutline } from './common/graph.type.ts';
import { test } from './graph-task-affected.fixture.ts';
import { GLYPH_CODE_POINTS } from '../src/graph/common/graph-glyph.const.ts';
import { FALLBACK_COLORS } from '../src/graph/common/graph.const.ts';
import { TASK_LEGEND_ROWS } from '../src/graph/common/legend-task.const.ts';

const SPEC_7 = { description: 'M3-2 spec 7.7, 4 (Feeds: graph)', type: 'requirement' };
const TASK_IDS = ['app#build', 'lib#build', 'ui#build'];
const MARKED = { 'app#build': 'changed', 'lib#build': 'dependency' } as const;
const MARKS = { mode: 'task', tasks: MARKED } as const;
const PACKAGE_MARKS = { mode: 'package', tasks: MARKED } as const;
const TICKED = { type: 'setViewToggle', toggle: 'affected', shown: true } as const;
const RUNNING_OUTLINE: RunOutline = { width: 2, colour: 'rgb(191,136,3)' };
const SHOWN_WITH_TEST = ['app#build', 'ui#test'];
const CHANGED = 0.4;
const DEPENDENCY = 0.18;
const DIMMED = FALLBACK_COLORS.dimmedOpacity;

const STATIC_TERMS = TASK_LEGEND_ROWS.map((row): string => row.text);
const TASK_LEVEL_TERMS = [...STATIC_TERMS, 'Affected (task level)', 'Affected via dependency (task level)'];
const PACKAGE_LEVEL_TERMS = [...STATIC_TERMS, 'Affected (package level)', 'Affected via dependency (package level)'];

test.describe('FEATURE: graph affected overlay', () => {
  test(
    'GIVEN task mode over app, lib and ui with the toggle on, changed draws a 0.4 halo, dependency 0.18, and null clears both in one message',
    { annotation: SPEC_7 },
    async ({ graphAffected, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened with affectedShown true', async () => graphAffected.open(true));

      await test.step('AND the host sends the marks', async () => graphTaskHost.sendAffected(MARKS));

      await test.step('THEN app#build has 0.4, lib#build 0.18 and ui#build 0', async () => {
        await graphAffected.expectHalo('app#build', CHANGED);
        await graphAffected.expectHalo('lib#build', DEPENDENCY);
        await graphAffected.expectHalo('ui#build', 0);
      });

      await test.step('WHEN the host sends affected null', async () => graphTaskHost.sendAffected(null));

      await test.step('THEN all three are 0', async () => {
        for (const id of TASK_IDS) await graphAffected.expectHalo(id, 0);
      });
    }
  );

  test(
    'GIVEN a running app#build, the marks leave its run glyph and run outline as they were',
    { annotation: SPEC_7 },
    async ({ graphAffected, graphTaskHost, graphGlyphs, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with affectedShown true and app#build runs', async () => {
        await graphAffected.open(true);
        await graphTaskHost.sendRuns({ 'app#build': 'running' });
      });

      await test.step('THEN app#build draws the sync glyph and the running outline', async () => {
        await graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.sync);
        await graphTaskProbe.expectRunOutline('app#build', RUNNING_OUTLINE);
      });

      await test.step('WHEN the host sends the marks with the same run', async () =>
        graphTaskHost.sendAffected(MARKS, { 'app#build': 'running' }));

      await test.step('THEN app#build has its halo', async () => graphAffected.expectHalo('app#build', CHANGED));

      await test.step('AND it still draws the sync glyph and the running outline', async () => {
        await graphGlyphs.expectFirstChar('app#build', GLYPH_CODE_POINTS.sync);
        await graphTaskProbe.expectRunOutline('app#build', RUNNING_OUTLINE);
      });
    }
  );

  test(
    'GIVEN both marks on and ui#test shown beside app#build, picking ui#test dims app#build and lib#build and fades their halos by the dimmed opacity',
    { annotation: SPEC_7 },
    async ({ graphAffected, graphTaskHost, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN the page is opened with affectedShown true and the host sends the marks', async () => {
        await graphAffected.open(true);
        await graphTaskHost.sendAffected(MARKS);
      });

      await test.step('THEN app#build has 0.4 and lib#build 0.18', async () => {
        await graphAffected.expectHalo('app#build', CHANGED);
        await graphAffected.expectHalo('lib#build', DEPENDENCY);
      });

      await test.step('WHEN the host shows app#build and ui#test', async () => graphTaskHost.sendShowTasks(SHOWN_WITH_TEST));

      await test.step('AND the ui project is expanded', async () => graphTaskProjects.expand('ui (2)'));

      await test.step('AND the ui#test name is pressed', async () => graphTaskProjects.pick('ui#test'));

      await test.step('THEN app#build and lib#build halos are faded by the dimmed opacity', async () => {
        await graphAffected.expectHalo('app#build', CHANGED * DIMMED);
        await graphAffected.expectHalo('lib#build', DEPENDENCY * DIMMED);
      });

      await test.step('AND ui#build has no halo', async () => graphAffected.expectHalo('ui#build', 0));
    }
  );

  test(
    'GIVEN the toggle off, the Legend lists the affected rows only while the toggle is on and marks are held, worded for their level',
    { annotation: SPEC_7 },
    async ({ graphAffected, graphLegend, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened with affectedShown false and the Legend is opened', async () => {
        await graphAffected.open(false);
        await graphLegend.open();
      });

      await test.step('THEN the Legend lists the static task rows', async () => graphLegend.expectTerms(STATIC_TERMS));

      await test.step('WHEN the host turns affectedShown on with no marks', async () => graphAffected.sendState(true));

      await test.step('THEN the Legend lists the same rows', async () => graphLegend.expectTerms(STATIC_TERMS));

      await test.step('WHEN the host sends task-level marks', async () => graphTaskHost.sendAffected(MARKS));

      await test.step('THEN the Legend adds the two task-level rows', async () => graphLegend.expectTerms(TASK_LEVEL_TERMS));

      await test.step('WHEN the host sends package-level marks', async () => graphTaskHost.sendAffected(PACKAGE_MARKS));

      await test.step('THEN the two rows say package level', async () => graphLegend.expectTerms(PACKAGE_LEVEL_TERMS));

      await test.step('WHEN the host sends affected null', async () => graphTaskHost.sendAffected(null));

      await test.step('THEN the two rows are gone', async () => graphLegend.expectTerms(STATIC_TERMS));

      await test.step('WHEN the host sends task-level marks again', async () => graphTaskHost.sendAffected(MARKS));

      await test.step('THEN the two task-level rows are back', async () => graphLegend.expectTerms(TASK_LEVEL_TERMS));

      await test.step('WHEN the host turns affectedShown off with the marks held', async () => graphAffected.sendState(false));

      await test.step('THEN the two rows are gone', async () => graphLegend.expectTerms(STATIC_TERMS));
    }
  );

  test(
    'GIVEN the toggle off, the Show affected box posts setViewToggle once and follows the next state',
    { annotation: SPEC_7 },
    async ({ graphAffected }): Promise<void> => {
      await test.step('WHEN the page is opened with affectedShown false', async () => graphAffected.open(false));

      await test.step('THEN the box is unticked', async () => graphAffected.expectTicked(false));

      await test.step('WHEN the box is ticked', async () => graphAffected.tick());

      await test.step('THEN the page posts setViewToggle affected shown once', async () => graphAffected.expectTogglePosts([TICKED]));

      await test.step('WHEN the host turns affectedShown off', async () => graphAffected.sendState(false));

      await test.step('THEN the box is unticked', async () => graphAffected.expectTicked(false));
    }
  );
});
