import { test } from './graph-task.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { TARGET_LIKE_NORMAL_SHOWN, allNormal, targetLikeLitStatesOf } from './test/utils/graph-target-like-lit.spec.util.ts';
import { TARGET_LIKE_CHOSEN_TASK, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const HOVER = { description: 'M4-5a spec 3.6, T4', type: 'requirement' };

const RF5 = { description: 'M4-5a Review Focus 5', type: 'requirement' };

const TARGET_LIKE_HASH = '7a7a7a7b';

const PACKAGES = stateNamesOf(CONTROLS_CACHED_STUB);

test.describe('FEATURE: graph task hover', () => {
  test.describe('GIVEN task mode with lib-3#build chosen', () => {
    test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, { chosen: [TARGET_LIKE_CHOSEN_TASK] }) });
      await graphHost.sendState(targetLikeTasksState());
      await graphProbe.expectNodeStates(TARGET_LIKE_NORMAL_SHOWN);
    });

    test(
      'a hovered task reads selected with its chain highlighted, and every node reads normal once the pointer leaves',
      { annotation: HOVER },
      async ({ graphHover, graphProbe }): Promise<void> => {
        await test.step('WHEN lib-3#test is hovered', async (): Promise<void> => graphHover.overNode('lib-3#test'));

        await test.step('THEN it reads selected, its chain highlighted and the rest dimmed', async (): Promise<void> =>
          graphProbe.expectNodeStates(targetLikeLitStatesOf('lib-3#test')));

        await test.step('WHEN the pointer leaves', async (): Promise<void> => graphHover.overBackground());

        await test.step('THEN every node reads normal', async (): Promise<void> =>
          graphProbe.expectNodeStates(TARGET_LIKE_NORMAL_SHOWN));
      }
    );

    test(
      'hovering never moves the selection: A clicked, B hovered, C clicked and the pointer gone leaves C lit and its heading in the panel',
      { annotation: RF5 },
      async ({ graphCanvas, graphHover, graphProbe, graphTaskDetails, graphTaskHost }): Promise<void> => {
        await test.step('WHEN lib-3#test is clicked', async (): Promise<void> => {
          await graphCanvas.tapNode('lib-3#test');
          await graphTaskHost.expectSavedTask({ selected: 'lib-3#test' });
        });

        await test.step('AND lib-3#docs is hovered', async (): Promise<void> => graphHover.overNode('lib-3#docs'));

        await test.step('THEN the canvas lights lib-3#docs while the panel still reads test', async (): Promise<void> => {
          await graphProbe.expectNodeStates(targetLikeLitStatesOf('lib-3#docs'));
          await graphTaskDetails.expectTask('test', 'test');
        });

        await test.step('WHEN lib-3#pack is clicked and the pointer leaves', async (): Promise<void> => {
          await graphCanvas.tapNode('lib-3#pack');
          await graphTaskHost.expectSavedTask({ selected: 'lib-3#pack' });
          await graphHover.overBackground();
        });

        await test.step('THEN lib-3#pack stays highlighted and the panel reads pack', async (): Promise<void> => {
          await graphProbe.expectNodeStates(targetLikeLitStatesOf('lib-3#pack'));
          await graphTaskDetails.expectTask('pack', 'pack');
        });
      }
    );
  });

  test(
    'GIVEN package mode, hovering a package leaves every node normal',
    { annotation: HOVER },
    async ({ graphHost, graphHover, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the controls graph is sent and ui is hovered', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(CONTROLS_CACHED_STUB);
        await graphHover.overNode('ui');
      });

      await test.step('THEN every node reads normal', async (): Promise<void> => graphProbe.expectNodeStates(allNormal(PACKAGES)));
    }
  );
});
