import type { TaskDefinition } from '@turbo-console/core';

import { expect, test } from './details.fixture.ts';
import { CONTINUOUS_CHIP, FULL_TERMS } from './test/common/details.const.ts';
import {
  HOSTILE_NAME_STUB,
  PACKAGE_DETAILS_STUB,
  RUN_VIEW_STUB,
  TASK_CARD_STUB,
  TASK_DEFINITION_STUB
} from './test/stubs/details-state.stub.ts';
import type { PackageDetails, TaskCard, ToolView } from '../src/bridge/common/details-state.type.ts';

const AC2 = { description: 'AC2', type: 'requirement' };
const AC6 = { description: 'AC6', type: 'requirement' };

const MULTI_LINE_COMMAND = 'tsc -b\n&& echo done';

const HEADER_CLASSES = ['card-title', 'run-status', 'card-actions'];

const WHITESPACE = ' \n\t ';

const HOSTILE_TOOL: ToolView = { title: HOSTILE_NAME_STUB, iconId: 'turbo-console-vitest' };

const HOSTILE_INPUTS: TaskDefinition = { ...TASK_DEFINITION_STUB, inputs: [HOSTILE_NAME_STUB] };

const HOSTILE_TEXT_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  command: HOSTILE_NAME_STUB,
  description: HOSTILE_NAME_STUB,
  definition: HOSTILE_INPUTS,
  tool: HOSTILE_TOOL
};

const CACHE_ONLY: TaskDefinition = { ...TASK_DEFINITION_STUB, persistent: false };

const PERSISTENT_ONLY: TaskDefinition = { ...TASK_DEFINITION_STUB, cache: false };

const NO_FLAGS: TaskDefinition = { ...TASK_DEFINITION_STUB, cache: false, persistent: false };

const EMPTY_LISTS: TaskDefinition = { ...TASK_DEFINITION_STUB, inputs: [], outputs: [], dependsOn: [], env: [] };

const NOT_PERSISTENT: TaskDefinition = { ...TASK_DEFINITION_STUB, persistent: false };

const PERSISTENT: TaskDefinition = { ...TASK_DEFINITION_STUB, persistent: true };

const MODEL_ONLY_CARD: TaskCard = { ...TASK_CARD_STUB, persistent: true, definition: NOT_PERSISTENT };

const DRY_RUN_ONLY_CARD: TaskCard = { ...TASK_CARD_STUB, persistent: false, definition: PERSISTENT };

const IDLE_CONTINUOUS_CARD: TaskCard = { ...TASK_CARD_STUB, taskId: 'web#dev', name: 'dev', persistent: true, run: RUN_VIEW_STUB };

const CHIP_CASES: [string, TaskDefinition | null, string[]][] = [
  ['only cache set', CACHE_ONLY, []],
  ['only persistent set', PERSISTENT_ONLY, [CONTINUOUS_CHIP, 'Not cacheable']],
  ['neither flag set', NO_FLAGS, ['Not cacheable']],
  ['no definition yet', null, []]
];

const CONTINUOUS_SOURCE_CASES: [string, TaskCard][] = [
  ['only the model says persistent', MODEL_ONLY_CARD],
  ['only the dry run says persistent', DRY_RUN_ONLY_CARD]
];

const SCRIPT_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  taskId: 'web#lint',
  name: 'lint',
  command: 'eslint .',
  description: null,
  dependents: [],
  definition: null,
  cacheStatus: null,
  isTurboTask: false,
  runCommand: 'pnpm run lint'
};

const NO_COMMAND_SCRIPT_CARD: TaskCard = { ...SCRIPT_CARD, command: null };

const BARE_SCRIPT_CARD: TaskCard = { ...NO_COMMAND_SCRIPT_CARD, runCommand: null };

const stateOf = (card: TaskCard): PackageDetails => {
  const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [card] };

  return state;
};

test.describe('FEATURE: package details page, card structure', () => {
  for (const [given, definition, chips] of CHIP_CASES) {
    test(`GIVEN a task with ${given}, the card shows chips [${chips.join(', ')}]`, async ({ detailsPage }): Promise<void> => {
      const task: TaskCard = { ...TASK_CARD_STUB, definition };
      const state = stateOf(task);

      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN exactly those chips render', async (): Promise<void> => detailsPage.card('build').expectChips(chips));
    });
  }

  test('GIVEN empty list fields, each reads as a quiet empty value', async ({ detailsPage }): Promise<void> => {
    const task: TaskCard = { ...TASK_CARD_STUB, definition: EMPTY_LISTS, dependents: [] };
    const state = stateOf(task);
    const card = detailsPage.card('build');

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN empty inputs read as the default', async (): Promise<void> =>
      card.expectFact('Inputs', 'empty', 'default (all files in the package)'));

    await test.step('AND empty outputs read none', async (): Promise<void> => card.expectFact('Outputs', 'empty', 'none'));

    await test.step('AND empty env reads none', async (): Promise<void> => card.expectFact('Env', 'empty', 'none'));

    await test.step('AND empty dependents read none', async (): Promise<void> => card.expectFact('Dependents', 'empty', 'none'));
  });

  test('GIVEN a task with no description, the card has no description paragraph and no Description row', async ({
    detailsPage
  }): Promise<void> => {
    const task: TaskCard = { ...TASK_CARD_STUB, description: null };
    const state = stateOf(task);

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN there is no description paragraph', async (): Promise<void> =>
      detailsPage.card('build').expectDescription(null));

    await test.step('AND the facts are unchanged', async (): Promise<void> => detailsPage.card('build').expectFields(FULL_TERMS));
  });

  test('GIVEN a blank description, the card has no description paragraph', async ({ detailsPage }): Promise<void> => {
    const emptyTask: TaskCard = { ...TASK_CARD_STUB, description: '' };
    const whitespaceTask: TaskCard = { ...TASK_CARD_STUB, description: WHITESPACE };
    const card = detailsPage.card('build');

    await test.step('WHEN the page shows an empty description', async (): Promise<void> => detailsPage.open(stateOf(emptyTask)));

    await test.step('THEN there is no description paragraph', async (): Promise<void> => card.expectDescription(null));

    await test.step('WHEN the page shows a whitespace-only description', async (): Promise<void> =>
      detailsPage.sendState(stateOf(whitespaceTask)));

    await test.step('THEN there is still no description paragraph', async (): Promise<void> => card.expectDescription(null));
  });

  test('GIVEN a card, its header holds the title, the status, then the actions', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('THEN the header children are in that order', async (): Promise<void> =>
      detailsPage.card('build').expectHeaderOrder(HEADER_CLASSES));
  });

  test('GIVEN a multi-line command, its block keeps the line breaks', async ({ detailsPage }): Promise<void> => {
    const task: TaskCard = { ...TASK_CARD_STUB, command: MULTI_LINE_COMMAND };
    const state = stateOf(task);

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN the Command block renders both lines', async (): Promise<void> =>
      expect(detailsPage.card('build').commandBlock('Command')).toHaveJSProperty('innerText', MULTI_LINE_COMMAND));
  });

  test('GIVEN hostile text in the command, description, tool title and a list entry, each renders as text', async ({
    detailsPage
  }): Promise<void> => {
    const card = detailsPage.card('build');

    await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(stateOf(HOSTILE_TEXT_CARD)));

    await test.step('THEN the Command block is the text', async (): Promise<void> =>
      expect(card.commandBlock('Command')).toHaveText(HOSTILE_NAME_STUB));

    await test.step('AND the description paragraph is the text', async (): Promise<void> => card.expectDescription(HOSTILE_NAME_STUB));

    await test.step('AND the list token is the text', async (): Promise<void> =>
      card.expectFact('Inputs', 'list', [HOSTILE_NAME_STUB]));

    await test.step('AND the Tool chip name is the text', async (): Promise<void> =>
      card.expectToolChip(HOSTILE_NAME_STUB, 'turbo-console-vitest'));

    await test.step('AND no image element exists', async (): Promise<void> => expect(detailsPage.images).toHaveCount(0));

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());
  });

  for (const [given, task] of CONTINUOUS_SOURCE_CASES) {
    test(`GIVEN ${given}, the card shows the Continuous chip`, { annotation: AC2 }, async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(stateOf(task)));

      await test.step('THEN the one chip is Continuous · runs until stopped', async (): Promise<void> =>
        detailsPage.card('build').expectChips([CONTINUOUS_CHIP]));
    });
  }

  test(
    'GIVEN an idle continuous card, only the chip mentions continuous',
    { annotation: AC2 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('dev');

      await test.step('WHEN the page shows an idle continuous card', async (): Promise<void> =>
        detailsPage.open(stateOf(IDLE_CONTINUOUS_CARD)));

      await test.step('THEN its status line is blank', async (): Promise<void> => card.expectBlankStatus());

      await test.step('AND the one chip is Continuous · runs until stopped', async (): Promise<void> =>
        card.expectChips([CONTINUOUS_CHIP]));
    }
  );

  test(
    'GIVEN a script with a run command and no body, the Script fact reads none',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('lint');
      const state = stateOf(NO_COMMAND_SCRIPT_CARD);

      await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN the run command shows in its block', async (): Promise<void> =>
        expect(card.commandBlock('Run command')).toHaveText('pnpm run lint'));

      await test.step('AND the Script fact is an empty value', async (): Promise<void> => card.expectFact('Script', 'empty', 'none'));
    }
  );

  test(
    'GIVEN a script with neither run command nor body, it has no block and the Script fact reads none',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('lint');
      const state = stateOf(BARE_SCRIPT_CARD);

      await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN there is no command block', async (): Promise<void> => card.expectNoCommandBlock());

      await test.step('AND the Script fact is an empty value', async (): Promise<void> => card.expectFact('Script', 'empty', 'none'));
    }
  );

  test('GIVEN a package with a task graph, Show in task graph posts the task id', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND Show in task graph is clicked', async (): Promise<void> =>
      detailsPage.pressButton('Show in task graph: build'));

    await test.step('THEN the page posts showInTaskGraph with its id', async (): Promise<void> =>
      detailsPage.expectLastPosted({ type: 'showInTaskGraph', taskId: 'web#build' }));
  });

  test('GIVEN a package with no task graph, the card has no Show in task graph and keeps Copy', async ({
    detailsPage
  }): Promise<void> => {
    const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, taskGraph: false };

    await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN there is no Show in task graph button', async (): Promise<void> =>
      detailsPage.expectButtonCount('Show in task graph: build', 0));

    await test.step('AND Copy is still there', async (): Promise<void> => expect(detailsPage.card('build').copyButton).toHaveCount(1));
  });

  test('GIVEN a turbo task and a script card, both have Show in task graph', async ({ detailsPage }): Promise<void> => {
    const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TASK_CARD_STUB, SCRIPT_CARD] };

    await test.step('WHEN the page shows both cards', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN the turbo task card has the button', async (): Promise<void> =>
      detailsPage.expectButtonCount('Show in task graph: build', 1));

    await test.step('AND the script card has it too', async (): Promise<void> =>
      detailsPage.expectButtonCount('Show in task graph: lint', 1));
  });
});
