import type { DetailsState, WebviewMessage } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import {
  cardTaskIdsOf,
  checkedTaskMessage,
  droppedMessageText,
  parseWebviewMessage,
  refusedRunTextOf
} from './details-message.util.ts';
import { toDetailsState } from './details-state.util.ts';
import { ALREADY_RUNNING_TEXT } from '../../run/common/run.const.ts';
import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/details.const.ts';
import type { CardTaskIds, CommandMessage } from '../common/details.type.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

const TASK_IDS: CardTaskIds = { all: new Set(['a#build', 'a#test', 'a#adhoc']) };
const THROWING_TYPE = {
  get type(): string {
    throw new Error('getter trap');
  }
};

/** The schema parse, then the task-id check, as the session runs them. */
const accepted = (value: unknown, ids: CardTaskIds): WebviewMessage | null => {
  const parsed = parseWebviewMessage(value);

  return checkedTaskMessage(parsed, ids);
};

describe('FEATURE: webview message validation', () => {
  describe('GIVEN a message of every valid type', () => {
    it('WHEN parsed THEN ready passes', () => {
      expect(accepted({ type: 'ready' }, TASK_IDS)).toStrictEqual({ type: 'ready' });
    });

    it.each(['run', 'stop', 'copy'])('WHEN parsed THEN %s of a panel task passes', (type) => {
      expect(accepted({ type, taskId: 'a#build' }, TASK_IDS)).toStrictEqual({ type, taskId: 'a#build' });
    });

    it('WHEN parsed THEN openPackageJson passes', () => {
      expect(accepted({ type: 'openPackageJson' }, TASK_IDS)).toStrictEqual({ type: 'openPackageJson' });
    });

    it.each(['dryRun', 'root'])('WHEN parsed THEN refresh with scope %s passes', (scope) => {
      expect(accepted({ type: 'refresh', scope }, TASK_IDS)).toStrictEqual({ type: 'refresh', scope });
    });

    it('WHEN parsed THEN showOutput passes', () => {
      expect(accepted({ type: 'showOutput' }, TASK_IDS)).toStrictEqual({ type: 'showOutput' });
    });
  });

  describe('GIVEN a message that is not valid', () => {
    it.each([
      ['null', null],
      ['a bare string', 'ready'],
      ['undefined', undefined],
      ['an array', [{ type: 'ready' }]],
      ['a task id that is not a string', { type: 'run', taskId: 5 }],
      ['a task message with no task id', { type: 'stop' }],
      ['a refresh with no scope', { type: 'refresh' }],
      ['a refresh with a foreign scope', { type: 'refresh', scope: 'all' }],
      ['an unknown type', { type: 'nope' }],
      ['a missing type', { taskId: 'a#build' }],
      ['a type getter that throws', THROWING_TYPE]
    ])('WHEN parsed THEN %s is dropped', (_name, value) => {
      expect(accepted(value, TASK_IDS)).toBeNull();
    });
  });

  describe('GIVEN a task id that is not one of the panel tasks', () => {
    it.each(['run', 'stop', 'copy'])('WHEN %s names a task of another package THEN it is dropped', (type) => {
      expect(accepted({ type, taskId: 'other#build' }, TASK_IDS)).toBeNull();
    });

    it('WHEN the id only starts with a panel task id THEN it is dropped', () => {
      expect(accepted({ type: 'run', taskId: 'a#build:extra' }, TASK_IDS)).toBeNull();
    });

    it('WHEN a panel task id only starts with the id THEN it is dropped', () => {
      expect(accepted({ type: 'run', taskId: 'a#' }, TASK_IDS)).toBeNull();
    });

    it('WHEN the id is an Object.prototype key THEN it is dropped', () => {
      expect(accepted({ type: 'run', taskId: 'constructor' }, TASK_IDS)).toBeNull();
    });
  });

  describe('GIVEN a script card', () => {
    it.each(['run', 'copy', 'stop'])('WHEN %s names it THEN it passes', (type) => {
      expect(accepted({ type, taskId: 'a#adhoc' }, TASK_IDS)).toStrictEqual({ type, taskId: 'a#adhoc' });
    });
  });

  describe('GIVEN no state, so an empty task set', () => {
    const noTasks: CardTaskIds = { all: new Set() };

    it.each(['run', 'stop', 'copy'])('WHEN %s arrives THEN it is dropped', (type) => {
      expect(accepted({ type, taskId: 'a#build' }, noTasks)).toBeNull();
    });

    it('WHEN a message with no task arrives THEN it still passes', () => {
      expect(accepted({ type: 'refresh', scope: 'root' }, noTasks)).toStrictEqual({ type: 'refresh', scope: 'root' });
    });
  });

  describe('GIVEN a message with extra keys', () => {
    it('WHEN a task message is parsed THEN only type and taskId survive', () => {
      const value = { type: 'run', taskId: 'a#build', command: 'rm -rf /', cwd: '/etc' };

      const message = accepted(value, TASK_IDS);

      expect(message).toStrictEqual({ type: 'run', taskId: 'a#build' });
    });

    it('WHEN a refresh is parsed THEN only type and scope survive', () => {
      const message = accepted({ type: 'refresh', scope: 'dryRun', taskId: 'a#build', force: true }, TASK_IDS);

      expect(message).toStrictEqual({ type: 'refresh', scope: 'dryRun' });
    });

    it('WHEN a ready is parsed THEN no key besides type survives', () => {
      const state = { kind: 'package' };

      const message = accepted({ type: 'ready', state }, TASK_IDS);

      expect(message).toStrictEqual({ type: 'ready' });
    });
  });

  describe('GIVEN the schema parse alone', () => {
    it('WHEN a task message names any task THEN it passes, the task id is checked apart', () => {
      expect(parseWebviewMessage({ type: 'run', taskId: 'other#build' })).toStrictEqual({ type: 'run', taskId: 'other#build' });
    });

    it('WHEN no message parsed THEN the task-id check keeps it null', () => {
      expect(checkedTaskMessage(null, TASK_IDS)).toBeNull();
    });
  });
});

describe('FEATURE: dropped message log text', () => {
  describe('GIVEN a plain object', () => {
    it('WHEN logged THEN the text is its JSON', () => {
      expect(droppedMessageText({ type: 'nope' })).toBe('{"type":"nope"}');
    });
  });

  describe('GIVEN a very long message', () => {
    it('WHEN logged THEN the text is cut to the log maximum', () => {
      const text = droppedMessageText({ type: 'x'.repeat(DROPPED_MESSAGE_MAX * 2) });

      expect(text).toHaveLength(DROPPED_MESSAGE_MAX);
    });
  });

  describe('GIVEN a value JSON cannot print', () => {
    it('WHEN the value holds a BigInt THEN the text is the unprintable marker and nothing throws', () => {
      expect(droppedMessageText({ type: 'run', taskId: 10n })).toBe(UNPRINTABLE_MESSAGE);
    });

    it('WHEN the value is circular THEN the text is the unprintable marker', () => {
      const circular: Record<string, unknown> = { type: 'run' };

      circular['self'] = circular;

      expect(droppedMessageText(circular)).toBe(UNPRINTABLE_MESSAGE);
    });

    it('WHEN the value is undefined THEN the text is the unprintable marker', () => {
      expect(droppedMessageText(undefined)).toBe(UNPRINTABLE_MESSAGE);
    });

    it('WHEN a toJSON getter throws THEN the text is the unprintable marker', () => {
      const hostile = {
        toJSON: (): never => {
          throw new Error('boom');
        }
      };

      expect(droppedMessageText(hostile)).toBe(UNPRINTABLE_MESSAGE);
    });
  });
});

describe('FEATURE: panel task ids', () => {
  it('GIVEN a package state WHEN asked THEN the ids are those of its cards', () => {
    const state = toDetailsState(DETAILS_INPUT_STUB);

    const ids = cardTaskIdsOf(state);

    expect(ids.all).toStrictEqual(new Set(['a#build', 'a#check', 'a#test']));
  });

  it('GIVEN a package with a script WHEN asked THEN the script is among the ids', () => {
    const pkg = { ...A_PACKAGE_STUB, tasks: [BUILD_TASK_STUB, ADHOC_TASK_STUB] };
    const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };
    const rootState = { ...DETAILS_ROOT_STATE_STUB, model };
    const state = toDetailsState({ ...DETAILS_INPUT_STUB, state: rootState });

    const ids = cardTaskIdsOf(state);

    expect(ids.all).toStrictEqual(new Set(['a#adhoc', 'a#build']));
  });

  it.each<[string, DetailsState | null]>([
    ['a missing package', { kind: 'missing', root: '/ws', packageName: 'a' }],
    ['no state yet', null]
  ])('GIVEN %s WHEN asked THEN there are none', (_name, state) => {
    const ids = cardTaskIdsOf(state);

    expect(ids.all.size).toBe(0);
  });
});

const SCRIPT_PACKAGE = { ...A_PACKAGE_STUB, tasks: [BUILD_TASK_STUB, ADHOC_TASK_STUB] };
const SCRIPT_MODEL = { ...DETAILS_MODEL_STUB, packages: [SCRIPT_PACKAGE] };
const SCRIPT_ROOT_STATE = { ...DETAILS_ROOT_STATE_STUB, model: SCRIPT_MODEL };
const RUN_ADHOC: CommandMessage = { type: 'run', taskId: 'a#adhoc' };

describe('FEATURE: refused runs', () => {
  const scriptStateOf = (scriptsShown: boolean, reloadError: string | null = null): DetailsState => {
    const state = toDetailsState({ ...DETAILS_INPUT_STUB, state: SCRIPT_ROOT_STATE });

    if (state.kind !== 'package') throw new Error('no package state');

    const changed: DetailsState = { ...state, scriptsShown, reloadError };

    return changed;
  };

  it('GIVEN scripts hidden WHEN run names a script card THEN it gets the already-running text', () => {
    expect(refusedRunTextOf(RUN_ADHOC, scriptStateOf(false), false)).toBe(ALREADY_RUNNING_TEXT);
  });

  it.each<[string, CommandMessage, boolean]>([
    ['stop names the script card while hidden', { type: 'stop', taskId: 'a#adhoc' }, false],
    ['copy names the script card while hidden', { type: 'copy', taskId: 'a#adhoc' }, false],
    ['run names a turbo task card while hidden', { type: 'run', taskId: 'a#build' }, false],
    ['run names the script card while shown', RUN_ADHOC, true]
  ])('GIVEN %s WHEN checked THEN it is not refused', (_name, message, scriptsShown) => {
    expect(refusedRunTextOf(message, scriptStateOf(scriptsShown), false)).toBeNull();
  });

  it('GIVEN no state WHEN run arrives THEN it is not refused', () => {
    expect(refusedRunTextOf(RUN_ADHOC, null, false)).toBeNull();
  });

  it('GIVEN a failed binary with its reload text WHEN run arrives THEN it gets that text first', () => {
    expect(refusedRunTextOf(RUN_ADHOC, scriptStateOf(false, 'no turbo'), true)).toBe('no turbo');
  });

  it('GIVEN a failed binary with no reload text WHEN a turbo task runs THEN it is not refused', () => {
    expect(refusedRunTextOf({ type: 'run', taskId: 'a#build' }, scriptStateOf(true), true)).toBeNull();
  });
});
