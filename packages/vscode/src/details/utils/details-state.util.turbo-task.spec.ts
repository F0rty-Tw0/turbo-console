import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import type { DetailsState, TaskCard } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { toDetailsState } from './details-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { DetailsInput } from '../common/details.type.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

const ADHOC_PACKAGE: PackageNode = { ...A_PACKAGE_STUB, tasks: [BUILD_TASK_STUB, ADHOC_TASK_STUB] };

const ADHOC_MODEL: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [ADHOC_PACKAGE] };

const ADHOC_STATE: RootState = { ...DETAILS_ROOT_STATE_STUB, model: ADHOC_MODEL };

const ADHOC_INPUT: DetailsInput = { ...DETAILS_INPUT_STUB, state: ADHOC_STATE };

const cardsOf = (state: DetailsState): TaskCard[] => {
  if (state.kind !== 'package') return [];

  return state.tasks;
};

const isTurboTaskOf = (card: TaskCard): [string, boolean] => [card.taskId, card.isTurboTask];

describe('FEATURE: package details state, tasks turbo does not define', () => {
  describe('GIVEN a package with a turbo task and a script no turbo config defines', () => {
    it('WHEN built THEN each card says whether turbo defines its task', () => {
      const state = toDetailsState(ADHOC_INPUT);

      const cards = cardsOf(state);

      expect(cards.map(isTurboTaskOf)).toStrictEqual([
        ['a#adhoc', false],
        ['a#build', true]
      ]);
    });
  });
});
