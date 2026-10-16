import type { DetailsState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { cardTaskIdsOf, droppedMessageText, parseWebviewMessage } from './details-message.util.ts';
import { toDetailsState } from './details-state.util.ts';
import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/details.const.ts';
import type { CardTaskIds } from '../common/details.type.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

const TASK_IDS: CardTaskIds = { all: new Set(['a#build', 'a#test', 'a#adhoc']), notTurbo: new Set(['a#adhoc']) };
const THROWING_TYPE = {
  get type(): string {
    throw new Error('getter trap');
  }
};

describe('FEATURE: webview message validation', () => {
  describe('GIVEN a message of every valid type', () => {
    it('WHEN parsed THEN ready passes', () => {
      expect(parseWebviewMessage({ type: 'ready' }, TASK_IDS)).toStrictEqual({ type: 'ready' });
    });

    it.each(['run', 'stop', 'copy'])('WHEN parsed THEN %s of a panel task passes', (type) => {
      expect(parseWebviewMessage({ type, taskId: 'a#build' }, TASK_IDS)).toStrictEqual({ type, taskId: 'a#build' });
    });

    it('WHEN parsed THEN openPackageJson passes', () => {
      expect(parseWebviewMessage({ type: 'openPackageJson' }, TASK_IDS)).toStrictEqual({ type: 'openPackageJson' });
    });

    it.each(['dryRun', 'root'])('WHEN parsed THEN refresh with scope %s passes', (scope) => {
      expect(parseWebviewMessage({ type: 'refresh', scope }, TASK_IDS)).toStrictEqual({ type: 'refresh', scope });
    });

    it('WHEN parsed THEN showOutput passes', () => {
      expect(parseWebviewMessage({ type: 'showOutput' }, TASK_IDS)).toStrictEqual({ type: 'showOutput' });
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
      expect(parseWebviewMessage(value, TASK_IDS)).toBeNull();
    });
  });

  describe('GIVEN a task id that is not one of the panel tasks', () => {
    it.each(['run', 'stop', 'copy'])('WHEN %s names a task of another package THEN it is dropped', (type) => {
      expect(parseWebviewMessage({ type, taskId: 'other#build' }, TASK_IDS)).toBeNull();
    });

    it('WHEN the id only starts with a panel task id THEN it is dropped', () => {
      expect(parseWebviewMessage({ type: 'run', taskId: 'a#build:extra' }, TASK_IDS)).toBeNull();
    });

    it('WHEN a panel task id only starts with the id THEN it is dropped', () => {
      expect(parseWebviewMessage({ type: 'run', taskId: 'a#' }, TASK_IDS)).toBeNull();
    });

    it('WHEN the id is an Object.prototype key THEN it is dropped', () => {
      expect(parseWebviewMessage({ type: 'run', taskId: 'constructor' }, TASK_IDS)).toBeNull();
    });
  });

  describe('GIVEN a card of a task no turbo config defines', () => {
    it.each(['run', 'copy'])('WHEN %s names it THEN it is dropped', (type) => {
      expect(parseWebviewMessage({ type, taskId: 'a#adhoc' }, TASK_IDS)).toBeNull();
    });

    it('WHEN stop names it THEN it passes, so a run that turned into a script can end', () => {
      expect(parseWebviewMessage({ type: 'stop', taskId: 'a#adhoc' }, TASK_IDS)).toStrictEqual({ type: 'stop', taskId: 'a#adhoc' });
    });

    it.each(['run', 'copy', 'stop'])('WHEN %s names a turbo task of the same panel THEN it still passes', (type) => {
      expect(parseWebviewMessage({ type, taskId: 'a#build' }, TASK_IDS)).toStrictEqual({ type, taskId: 'a#build' });
    });
  });

  describe('GIVEN no state, so an empty task set', () => {
    const noTasks: CardTaskIds = { all: new Set(), notTurbo: new Set() };

    it.each(['run', 'stop', 'copy'])('WHEN %s arrives THEN it is dropped', (type) => {
      expect(parseWebviewMessage({ type, taskId: 'a#build' }, noTasks)).toBeNull();
    });

    it('WHEN a message with no task arrives THEN it still passes', () => {
      expect(parseWebviewMessage({ type: 'refresh', scope: 'root' }, noTasks)).toStrictEqual({ type: 'refresh', scope: 'root' });
    });
  });

  describe('GIVEN a message with extra keys', () => {
    it('WHEN a task message is parsed THEN only type and taskId survive', () => {
      const value = { type: 'run', taskId: 'a#build', command: 'rm -rf /', cwd: '/etc' };

      const message = parseWebviewMessage(value, TASK_IDS);

      expect(message).toStrictEqual({ type: 'run', taskId: 'a#build' });
    });

    it('WHEN a refresh is parsed THEN only type and scope survive', () => {
      const message = parseWebviewMessage({ type: 'refresh', scope: 'dryRun', taskId: 'a#build', force: true }, TASK_IDS);

      expect(message).toStrictEqual({ type: 'refresh', scope: 'dryRun' });
    });

    it('WHEN a ready is parsed THEN no key besides type survives', () => {
      const state = { kind: 'package' };

      const message = parseWebviewMessage({ type: 'ready', state }, TASK_IDS);

      expect(message).toStrictEqual({ type: 'ready' });
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
  it('GIVEN a package state WHEN asked THEN the ids are those of its cards and none is a script', () => {
    const state = toDetailsState(DETAILS_INPUT_STUB);

    const ids = cardTaskIdsOf(state);

    expect(ids.all).toStrictEqual(new Set(['a#build', 'a#check', 'a#test']));
    expect(ids.notTurbo.size).toBe(0);
  });

  it('GIVEN a package with a script WHEN asked THEN the script is in both sets', () => {
    const pkg = { ...A_PACKAGE_STUB, tasks: [BUILD_TASK_STUB, ADHOC_TASK_STUB] };
    const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };
    const rootState = { ...DETAILS_ROOT_STATE_STUB, model };
    const state = toDetailsState({ ...DETAILS_INPUT_STUB, state: rootState });

    const ids = cardTaskIdsOf(state);

    expect(ids.all).toStrictEqual(new Set(['a#adhoc', 'a#build']));
    expect(ids.notTurbo).toStrictEqual(new Set(['a#adhoc']));
  });

  it.each<[string, DetailsState | null]>([
    ['a missing package', { kind: 'missing', root: '/ws', packageName: 'a' }],
    ['no state yet', null]
  ])('GIVEN %s WHEN asked THEN there are none', (_name, state) => {
    const ids = cardTaskIdsOf(state);

    expect(ids.all.size).toBe(0);
    expect(ids.notTurbo.size).toBe(0);
  });
});
