import type { NodeStates } from './common/graph.type.ts';
import { test } from './graph-task.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { TARGET_LIKE_CHOSEN_TASK, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const HOVER = { description: 'M4-5a spec 3.6, T4', type: 'requirement' };

const RF5 = { description: 'M4-5a Review Focus 5', type: 'requirement' };

const TARGET_LIKE_HASH = '7a7a7a7b';

/** The own tasks of `lib-3#build` in the shown set; each needs only `lib-3#build`, which needs `hub#build`. */
const OWN_TASKS = ['lib-3#docs', 'lib-3#pack', 'lib-3#test', 'lib-3#typecheck'];

const SHOWN_IDS = ['feat-2#build', 'feat-3#build', 'hub#build', 'lib-3#build', ...OWN_TASKS];

const COMPOUND_IDS = ['pkg:feat-2', 'pkg:feat-3', 'pkg:hub', 'pkg:lib-3'];

const allNormal = (ids: string[]): NodeStates => Object.fromEntries(ids.map((id): [string, 'normal'] => [id, 'normal']));

/** `leaf` selected, its two dependencies highlighted, the other own tasks and both dependents dimmed. */
const litStatesOf = (leaf: string): NodeStates => {
  const own = Object.fromEntries(OWN_TASKS.map((id): [string, 'selected' | 'dimmed'] => [id, id === leaf ? 'selected' : 'dimmed']));
  const states: NodeStates = {
    ...own,
    'feat-2#build': 'dimmed',
    'feat-3#build': 'dimmed',
    'hub#build': 'highlighted',
    'lib-3#build': 'highlighted',
    'pkg:feat-2': 'dimmed',
    'pkg:feat-3': 'dimmed',
    'pkg:hub': 'normal',
    'pkg:lib-3': 'normal'
  };

  return states;
};

const NORMAL_SHOWN = allNormal([...SHOWN_IDS, ...COMPOUND_IDS]);

const PACKAGES = stateNamesOf(CONTROLS_CACHED_STUB);

test.describe('FEATURE: graph task hover', () => {
  test.describe('GIVEN task mode with lib-3#build chosen', () => {
    test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, { chosen: [TARGET_LIKE_CHOSEN_TASK] }) });
      await graphHost.sendState(targetLikeTasksState());
      await graphProbe.expectNodeStates(NORMAL_SHOWN);
    });

    test(
      'a hovered task reads selected with its chain highlighted, and every node reads normal once the pointer leaves',
      { annotation: HOVER },
      async ({ graphHover, graphProbe }): Promise<void> => {
        await test.step('WHEN lib-3#test is hovered', async (): Promise<void> => graphHover.overNode('lib-3#test'));

        await test.step('THEN it reads selected, its chain highlighted and the rest dimmed', async (): Promise<void> =>
          graphProbe.expectNodeStates(litStatesOf('lib-3#test')));

        await test.step('WHEN the pointer leaves', async (): Promise<void> => graphHover.overBackground());

        await test.step('THEN every node reads normal', async (): Promise<void> => graphProbe.expectNodeStates(NORMAL_SHOWN));
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
          await graphProbe.expectNodeStates(litStatesOf('lib-3#docs'));
          await graphTaskDetails.expectTask('test', 'test');
        });

        await test.step('WHEN lib-3#pack is clicked and the pointer leaves', async (): Promise<void> => {
          await graphCanvas.tapNode('lib-3#pack');
          await graphTaskHost.expectSavedTask({ selected: 'lib-3#pack' });
          await graphHover.overBackground();
        });

        await test.step('THEN lib-3#pack stays highlighted and the panel reads pack', async (): Promise<void> => {
          await graphProbe.expectNodeStates(litStatesOf('lib-3#pack'));
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
