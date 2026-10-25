import { expect, test } from './graph-task.fixture.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphAtomGroupState } from '../src/bridge/common/graph-message.type.ts';

const REQUIREMENT = { description: 'M5-2 spec 3.3, 3.5', type: 'requirement' };

const TARGET_LIKE_HASH = '7a7a7a7b';

/** The umbrella and every `build` it needs, directly or not; nothing needs the umbrella. */
const SHOWN = [
  TARGET_LIKE_UMBRELLA,
  'feat-1#build',
  'feat-2#build',
  'hub#build',
  'lib-1#build',
  'lib-2#build',
  'lib-3#build',
  'util-a#build',
  'util-b#build'
];

const COLLAPSED_TEXT = 'e2e-ci\n10 files';

const COUNTED_TEXT = 'e2e-ci\n10 files · 3 cached · 1 failed';

const COUNTED: GraphAtomGroupState = { counts: '10 files · 3 cached · 1 failed', files: {} };

const COUNTED_GROUPS = { [TARGET_LIKE_UMBRELLA]: COUNTED };

const SKIPPED_FILES = { 'app-1#e2e-ci--tests/spec-002.spec.ts': 'skipped' };

const SKIPPED_STATE = { counts: '10 files · 9 cached', files: SKIPPED_FILES };

const SKIPPED_GROUPS = { [TARGET_LIKE_UMBRELLA]: SKIPPED_STATE };

const SHOWN_POST = [TARGET_LIKE_UMBRELLA];

test.describe('FEATURE: graph task mode with an Atomizer group', () => {
  test.describe('GIVEN the umbrella chosen and the target-like state sent', () => {
    test.beforeEach(async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, { chosen: [TARGET_LIKE_UMBRELLA] }) });
      await graphHost.sendState(targetLikeTasksState());
      await graphTaskProbe.expectTaskIds(SHOWN);
    });

    test(
      'the umbrella shows its file count, no aggregate node is drawn and the page reports the umbrella shown',
      { annotation: REQUIREMENT },
      async ({ graphTaskHost, graphTaskProbe }): Promise<void> => {
        await test.step('THEN the umbrella text is its name over its file count', async (): Promise<void> =>
          graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COLLAPSED_TEXT));

        await test.step('AND no node id ends in --all', async (): Promise<void> => {
          const ids = await graphTaskProbe.taskIds();

          expect(ids.filter((id) => id.endsWith('--all'))).toEqual([]);
        });

        await test.step('AND the page posted shownUmbrellas with the umbrella', async (): Promise<void> =>
          graphTaskHost.expectShownUmbrellas([SHOWN_POST]));
      }
    );

    test(
      'atoms update the counts line and move no task node',
      { annotation: REQUIREMENT },
      async ({ graphTaskHost, graphTaskProbe }): Promise<void> => {
        const before = await graphTaskProbe.taskPositions();

        await test.step('WHEN atoms arrive with counts', async (): Promise<void> => graphTaskHost.sendAtoms(COUNTED_GROUPS));

        await test.step('THEN the umbrella text shows the counts', async (): Promise<void> =>
          graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COUNTED_TEXT));

        await test.step('AND no task node moved', async (): Promise<void> => {
          const after = await graphTaskProbe.taskPositions();

          expect(after).toEqual(before);
        });
      }
    );

    test(
      'an atoms message with an outcome outside the four is dropped',
      { annotation: REQUIREMENT },
      async ({ graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
        await test.step('WHEN a raw atoms message has the outcome skipped', async (): Promise<void> =>
          graphTaskHost.sendRaw({ type: 'atoms', groups: SKIPPED_GROUPS }));

        await test.step('THEN the umbrella text is unchanged', async (): Promise<void> =>
          graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COLLAPSED_TEXT));

        await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
      }
    );

    test(
      'the same state again reports the umbrella shown a second time and moves no task node',
      { annotation: REQUIREMENT },
      async ({ graphHost, graphTaskHost, graphTaskProbe }): Promise<void> => {
        const before = await graphTaskProbe.taskPositions();

        await test.step('WHEN the same state is sent again', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

        await test.step('THEN the page posts shownUmbrellas with the umbrella a second time', async (): Promise<void> =>
          graphTaskHost.expectShownUmbrellas([SHOWN_POST, SHOWN_POST]));

        await test.step('AND no task node moved', async (): Promise<void> => {
          const after = await graphTaskProbe.taskPositions();

          expect(after).toEqual(before);
        });
      }
    );
  });
});
