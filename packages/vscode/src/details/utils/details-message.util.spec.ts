import { describe, expect, it } from 'vitest';

import { droppedMessageText, parseWebviewMessage } from './details-message.util.ts';
import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/details.const.ts';

const TASK_IDS: ReadonlySet<string> = new Set(['a#build', 'a#test']);

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
      ['a missing type', { taskId: 'a#build' }]
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

  describe('GIVEN no state, so an empty task set', () => {
    const noTasks: ReadonlySet<string> = new Set();

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
