import type { DetailsState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { refusedRunTextOf } from './details-message.util.ts';
import { toDetailsState } from './details-state.util.ts';
import { ALREADY_RUNNING_TEXT } from '../../run/common/run.const.ts';
import type { CommandMessage } from '../common/details.type.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

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

  describe('GIVEN scripts hidden', () => {
    it('WHEN run names a script card THEN it gets the already-running text', () => {
      expect(refusedRunTextOf(RUN_ADHOC, scriptStateOf(false), false)).toBe(ALREADY_RUNNING_TEXT);
    });
  });

  describe.each<[string, CommandMessage, boolean]>([
    ['stop names the script card while hidden', { type: 'stop', taskId: 'a#adhoc' }, false],
    ['copy names the script card while hidden', { type: 'copy', taskId: 'a#adhoc' }, false],
    ['run names a turbo task card while hidden', { type: 'run', taskId: 'a#build' }, false],
    ['run names the script card while shown', RUN_ADHOC, true]
  ])('GIVEN %s', (_name, message, scriptsShown) => {
    it('WHEN checked THEN it is not refused', () => {
      expect(refusedRunTextOf(message, scriptStateOf(scriptsShown), false)).toBeNull();
    });
  });

  describe('GIVEN no state', () => {
    it('WHEN run arrives THEN it is not refused', () => {
      expect(refusedRunTextOf(RUN_ADHOC, null, false)).toBeNull();
    });
  });

  describe('GIVEN a failed binary with its reload text', () => {
    it('WHEN run arrives THEN it gets that text first', () => {
      expect(refusedRunTextOf(RUN_ADHOC, scriptStateOf(false, 'no turbo'), true)).toBe('no turbo');
    });
  });

  describe('GIVEN a failed binary with no reload text', () => {
    it('WHEN a turbo task runs THEN it is not refused', () => {
      expect(refusedRunTextOf({ type: 'run', taskId: 'a#build' }, scriptStateOf(true), true)).toBeNull();
    });
  });
});
