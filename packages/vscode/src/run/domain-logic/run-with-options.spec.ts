import type { RunExtras } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { runWithOptions } from './run-with-options.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { TASK_TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { ARGS_PLACEHOLDER, CONCURRENCY_MESSAGE, CONCURRENCY_PLACEHOLDER, CONCURRENCY_PROMPT } from '../common/run-options.const.ts';
import type { RunRequest } from '../common/run.type.ts';
import type { RunOptionsFakes } from '../test/common/run-options-fakes.type.ts';
import { ONLY_EXTRAS, PLAIN_REQUEST } from '../test/common/run-options.const.ts';
import { runOptionsFakes } from '../test/utils/run-options-fakes.spec.util.ts';
import { optionItemsOf } from '../utils/option-items.util.ts';
import { argsErrorText, pickerPlaceholderOf, turboArgsPromptOf } from '../utils/run-options-text.util.ts';

const FORCED: RunRequest = { ...PLAIN_REQUEST, force: true };

const KEEP_EXTRAS: RunExtras = { continueMode: 'dependencies-successful' };

const TRIMMED_EXTRAS: RunExtras = { concurrency: '4' };

const ALL_EXTRAS: RunExtras = {
  only: true,
  continueMode: 'dependencies-successful',
  concurrency: '50%',
  passThrough: ['--watch']
};

describe('FEATURE: Run with Options on a turbo task', () => {
  let roots: RootStore;
  let fakes: RunOptionsFakes;

  const invoke = async (): Promise<void> => runWithOptions(roots, fakes.ports, TASK_TREE_NODE_STUB);

  beforeEach(() => {
    roots = new RootStore();
    fakes = runOptionsFakes();
    roots.set([ROOT_FOLDER_STUB], coordinatorMock);
    roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
  });

  describe('GIVEN a root with a binary and package a holding the build task', () => {
    it('WHEN it is invoked THEN the picker gets the option items and the placeholder of the task', async () => {
      const items = optionItemsOf(TASK_NODE_STUB);
      const placeholder = pickerPlaceholderOf('build', 'a');

      await invoke();

      expect(fakes.pickMany).toHaveBeenCalledExactlyOnceWith(items, placeholder);
    });

    it('WHEN the pick is empty THEN run gets the plain request with no extras key and no box opens', async () => {
      fakes.choose([]);

      await invoke();

      expect(fakes.launched()).toStrictEqual(PLAIN_REQUEST);
      expect(fakes.input).not.toHaveBeenCalled();
    });

    it('WHEN only Without cache is picked THEN run gets the request with force and no extras key', async () => {
      fakes.choose(['force']);

      await invoke();

      expect(fakes.launched()).toStrictEqual(FORCED);
    });

    it('WHEN only Only is picked THEN run gets extras with only', async () => {
      fakes.choose(['only']);

      await invoke();

      expect(fakes.launched()).toStrictEqual({ ...PLAIN_REQUEST, extras: ONLY_EXTRAS });
    });

    it('WHEN only Keep going is picked THEN run gets extras with the continue mode', async () => {
      fakes.choose(['continue']);

      await invoke();

      expect(fakes.launched()).toStrictEqual({ ...PLAIN_REQUEST, extras: KEEP_EXTRAS });
    });

    describe('WHEN all five are picked and the boxes answer 50% and --watch', () => {
      beforeEach(async () => {
        fakes.choose(['force', 'only', 'continue', 'concurrency', 'passThrough']);
        fakes.answer('50%', '--watch');

        await invoke();
      });

      it('THEN run gets force and all four extras', () => {
        expect(fakes.launched()).toStrictEqual({ ...FORCED, extras: ALL_EXTRAS });
      });

      it('THEN the boxes were asked concurrency first, then the arguments', () => {
        const expected = [CONCURRENCY_PROMPT, turboArgsPromptOf('build')];

        const prompts = fakes.input.mock.calls.map((call) => call[0].prompt);

        expect(prompts).toStrictEqual(expected);
      });
    });

    it('WHEN Extra arguments is picked and the box answers nothing THEN run gets the plain request', async () => {
      fakes.choose(['passThrough']);
      fakes.answer('');

      await invoke();

      expect(fakes.launched()).toStrictEqual(PLAIN_REQUEST);
    });

    describe('WHEN the concurrency box answers with spaces around 4', () => {
      beforeEach(async () => {
        fakes.choose(['concurrency']);
        fakes.answer(' 4 ');

        await invoke();
      });

      it('THEN extras holds the trimmed 4', () => {
        expect(fakes.launched()).toStrictEqual({ ...PLAIN_REQUEST, extras: TRIMMED_EXTRAS });
      });

      it('THEN the box shows the concurrency placeholder', () => {
        const ask = fakes.askOf(0);

        expect(ask.placeholder).toBe(CONCURRENCY_PLACEHOLDER);
      });

      it('THEN the box accepts the spaced 4', () => {
        const ask = fakes.askOf(0);
        const error = ask.validate(' 4 ');

        expect(error).toBeNull();
      });

      it('THEN the box rejects 0', () => {
        const ask = fakes.askOf(0);
        const error = ask.validate('0');

        expect(error).toBe(CONCURRENCY_MESSAGE);
      });
    });

    describe('WHEN Extra arguments is picked and its box is asked', () => {
      beforeEach(async () => {
        fakes.choose(['passThrough']);

        await invoke();
      });

      it('THEN the box shows the arguments placeholder', () => {
        const ask = fakes.askOf(0);

        expect(ask.placeholder).toBe(ARGS_PLACEHOLDER);
      });

      it('THEN the box names the first bad argument', () => {
        const expected = argsErrorText(1, 'a,b');

        const ask = fakes.askOf(0);
        const error = ask.validate('a,b');

        expect(error).toBe(expected);
      });

      it('THEN the box accepts plain arguments', () => {
        const ask = fakes.askOf(0);
        const error = ask.validate('--a --b');

        expect(error).toBeNull();
      });
    });
  });
});
