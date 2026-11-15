import type { WebviewMessage } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { checkedTaskMessage, parseWebviewMessage } from './details-message.util.ts';
import type { CardTaskIds } from '../common/details.type.ts';

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

    it.each(['run', 'stop', 'copy', 'showInTaskGraph'])('WHEN parsed THEN %s of a panel task passes', (type) => {
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
    it.each(['run', 'stop', 'copy', 'showInTaskGraph'])('WHEN %s names a task of another package THEN it is dropped', (type) => {
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
    it.each(['run', 'copy', 'stop', 'showInTaskGraph'])('WHEN %s names it THEN it passes', (type) => {
      expect(accepted({ type, taskId: 'a#adhoc' }, TASK_IDS)).toStrictEqual({ type, taskId: 'a#adhoc' });
    });
  });

  describe('GIVEN no state, so an empty task set', () => {
    const noTasks: CardTaskIds = { all: new Set() };

    it.each(['run', 'stop', 'copy', 'showInTaskGraph'])('WHEN %s arrives THEN it is dropped', (type) => {
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
