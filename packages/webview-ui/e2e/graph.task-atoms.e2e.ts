import { test } from './graph-task.fixture.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import type { GraphAtomGroupState } from '../src/bridge/common/graph-message.type.ts';
import type { Positions } from '../src/bridge/common/graph-state.type.ts';

const SPEC_3_3 = { description: 'M5-2 spec 3.3', type: 'requirement' };

const SPEC_3_5 = { description: 'M5-2 spec 3.5', type: 'requirement' };

const COLLAPSED_TEXT = 'e2e-ci\n10 files';

const COUNTED_TEXT = 'e2e-ci\n10 files · 3 cached · 1 failed';

const COUNTED: GraphAtomGroupState = { counts: '10 files · 3 cached · 1 failed', files: {} };

const COUNTED_GROUPS = { [TARGET_LIKE_UMBRELLA]: COUNTED };

const SKIPPED_FILES = { 'app-1#e2e-ci--tests/spec-002.spec.ts': 'skipped' };

const SKIPPED_STATE = { counts: '10 files · 9 cached', files: SKIPPED_FILES };

const SKIPPED_GROUPS = { [TARGET_LIKE_UMBRELLA]: SKIPPED_STATE };

const SHOWN_POST = [TARGET_LIKE_UMBRELLA];

test.describe('FEATURE: graph task mode with an Atomizer group', () => {
  test(
    'GIVEN the umbrella chosen and the target-like state sent, the umbrella shows its file count, no aggregate node is drawn and the page reports the umbrella shown',
    { annotation: SPEC_3_3 },
    async ({ graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('THEN the umbrella text is its name over its file count', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COLLAPSED_TEXT));

      await test.step('AND no node id ends in --all', async (): Promise<void> => graphTaskProbe.expectNoAggregate());

      await test.step('AND the page posted shownUmbrellas with the umbrella', async (): Promise<void> =>
        graphTaskHost.expectShownUmbrellas([SHOWN_POST]));
    }
  );

  test(
    'GIVEN the umbrella chosen and the target-like state sent, atoms update the counts line and move no task node',
    { annotation: SPEC_3_3 },
    async ({ graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      const before = await test.step('AND the task positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      await test.step('AND atoms arrive with counts', async (): Promise<void> => graphTaskHost.sendAtoms(COUNTED_GROUPS));

      await test.step('THEN the umbrella text shows the counts', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COUNTED_TEXT));

      await test.step('AND no task node moved', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );

  test(
    'GIVEN the umbrella chosen and the target-like state sent, an atoms message with an outcome outside the four is dropped',
    { annotation: SPEC_3_5 },
    async ({ graphPage, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      await test.step('AND a raw atoms message has the outcome skipped', async (): Promise<void> =>
        graphTaskHost.sendRaw({ type: 'atoms', groups: SKIPPED_GROUPS }));

      await test.step('THEN the umbrella text is unchanged', async (): Promise<void> =>
        graphTaskProbe.expectText(TARGET_LIKE_UMBRELLA, COLLAPSED_TEXT));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN the umbrella chosen and the target-like state sent, the same state again reports the umbrella shown a second time and moves no task node',
    { annotation: SPEC_3_3 },
    async ({ graphHost, graphTaskHost, graphTaskProbe, openUmbrella }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => openUmbrella());

      const before = await test.step('AND the task positions are read', async (): Promise<Positions> =>
        graphTaskProbe.taskPositions());

      await test.step('AND the same state is sent again', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

      await test.step('THEN the page posts shownUmbrellas with the umbrella a second time', async (): Promise<void> =>
        graphTaskHost.expectShownUmbrellas([SHOWN_POST, SHOWN_POST]));

      await test.step('AND no task node moved', async (): Promise<void> => graphTaskProbe.expectTaskPositions(before));
    }
  );
});
