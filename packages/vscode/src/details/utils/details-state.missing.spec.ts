import { describe, expect, it } from 'vitest';

import { toDetailsState } from './details-state.util.ts';
import type { DetailsInput } from '../common/details.type.ts';
import { DETAILS_INPUT_STUB } from '../test/stubs/details-model.stub.ts';

const inputWith = (overrides: Partial<DetailsInput>): DetailsInput => {
  const input: DetailsInput = { ...DETAILS_INPUT_STUB, ...overrides };

  return input;
};

describe('FEATURE: the missing state carries the last known label', () => {
  describe('GIVEN a package that is not in the model', () => {
    it('WHEN the panel knew its label THEN the missing state holds it', () => {
      const input = inputWith({ packageName: '//', lastLabel: 'single-app' });

      const state = toDetailsState(input);

      expect(state).toStrictEqual({ kind: 'missing', root: '/ws', packageName: '//', label: 'single-app' });
    });

    it('WHEN the panel knew no label THEN the label is null', () => {
      const input = inputWith({ packageName: 'gone', lastLabel: null });

      const state = toDetailsState(input);

      expect(state).toStrictEqual({ kind: 'missing', root: '/ws', packageName: 'gone', label: null });
    });
  });
});
