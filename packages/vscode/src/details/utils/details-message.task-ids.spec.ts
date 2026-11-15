import type { DetailsState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { cardTaskIdsOf } from './details-message.util.ts';
import { toDetailsState } from './details-state.util.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

describe('FEATURE: panel task ids', () => {
  describe('GIVEN a package state', () => {
    it('WHEN asked THEN the ids are those of its cards', () => {
      const state = toDetailsState(DETAILS_INPUT_STUB);

      const ids = cardTaskIdsOf(state);

      expect(ids.all).toStrictEqual(new Set(['a#build', 'a#check', 'a#test']));
    });
  });

  describe('GIVEN a package with a script', () => {
    it('WHEN asked THEN the script is among the ids', () => {
      const pkg = { ...A_PACKAGE_STUB, tasks: [BUILD_TASK_STUB, ADHOC_TASK_STUB] };
      const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };
      const rootState = { ...DETAILS_ROOT_STATE_STUB, model };
      const state = toDetailsState({ ...DETAILS_INPUT_STUB, state: rootState });

      const ids = cardTaskIdsOf(state);

      expect(ids.all).toStrictEqual(new Set(['a#adhoc', 'a#build']));
    });
  });

  describe.each<[string, DetailsState | null]>([
    ['a missing package', { kind: 'missing', root: '/ws', packageName: 'a', label: null }],
    ['no state yet', null]
  ])('GIVEN %s', (_name, state) => {
    it('WHEN asked THEN there are none', () => {
      const ids = cardTaskIdsOf(state);

      expect(ids.all.size).toBe(0);
    });
  });
});
