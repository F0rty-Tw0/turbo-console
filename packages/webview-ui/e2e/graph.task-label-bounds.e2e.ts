import { test } from './graph-task.fixture.ts';
import { GraphBoxTitles } from './pages/graph-box-titles.po.ts';
import { GraphTaskCards } from './pages/graph-task-cards.po.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { packageOf } from './test/utils/graph-package.spec.util.ts';
import { taskOf } from './test/utils/graph-task-of.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';

const AC4 = { description: 'G2-5a AC4, F5', type: 'requirement' };

const SOLO_HASH = '7a5c0f01';

const SOLO_TASK = 'solo#build';

const SOLO_BOX = 'pkg:solo';

/** Between the idle label (~45–55 px) and regular `Failed to start` (~80–90 px across CI fonts); spike.md's 94 px was a different string. */
const WIDE_LABEL_PX = 65;

/** One package, `solo`, with its one turbo task `build` and no Scripts box: a titled-row (box-framed) box around one card. */
const soloState = (): GraphReady => {
  const state: GraphReady = {
    ...TASK_MODE_STATE_STUB,
    hash: SOLO_HASH,
    packages: [packageOf('solo', 'packages/solo', [], 1)],
    edges: [],
    tasks: [taskOf('solo', 'build')]
  };

  return state;
};

test.describe('FEATURE: graph task card label bounds', () => {
  test(
    'GIVEN one card alone in its framed box, a runs message that widens its label keeps its label box as wide as the label',
    { annotation: AC4 },
    async ({ graphHost, graphPage, graphTaskHost, graphTaskProbe, page }): Promise<void> => {
      test.fail(true, 'F5: remove with the boundingBox patch hunk (Task 3.2)');

      const graphBoxTitles = new GraphBoxTitles(page);
      const cards = new GraphTaskCards(page);

      await test.step('WHEN the page is opened with solo#build chosen', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState(SOLO_HASH, { chosen: [SOLO_TASK] }) });
        await graphHost.sendState(soloState());
      });

      await test.step('AND solo#build is the only task drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds([SOLO_TASK]));

      await test.step('AND its box is framed', async (): Promise<void> => graphBoxTitles.expectFramed(SOLO_BOX, true));

      await test.step('AND its idle label box is as wide as its label', async (): Promise<void> =>
        cards.expectLabelBoxFits(SOLO_TASK, 0));

      await test.step('AND solo#build fails to start', async (): Promise<void> =>
        graphTaskHost.sendRuns({ [SOLO_TASK]: 'failed-to-start' }));

      await test.step('THEN its label box is as wide as its wider label', async (): Promise<void> =>
        cards.expectLabelBoxFits(SOLO_TASK, WIDE_LABEL_PX));
    }
  );
});
