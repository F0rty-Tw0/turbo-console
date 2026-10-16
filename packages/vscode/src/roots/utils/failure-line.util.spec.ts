import { TurboException } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { newFailureLineOf } from './failure-line.util.ts';
import type { LoadFailure } from '../common/root.type.ts';
import { LOADED_MODEL_STUB, LOAD_FAILURE_STUB } from '../test/stubs/root.stub.ts';
import { loadFailureOf } from '../test/utils/load-failure.spec.util.ts';

const UNSUPPORTED: LoadFailure = loadFailureOf('binary', new TurboException('version-unsupported', 'turbo 2.10.4'));

const OTHER_MESSAGE: LoadFailure = loadFailureOf('binary', new TurboException('not-found', 'still no turbo'));

describe('FEATURE: log line of a new load failure', () => {
  describe('GIVEN a root with no error', () => {
    it('WHEN a failure arrives THEN its line is logged', () => {
      const line = newFailureLineOf(null, LOAD_FAILURE_STUB);

      expect(line).toBe('turbo not-found: no turbo');
    });

    it('WHEN a model arrives THEN there is no line', () => {
      const line = newFailureLineOf(null, LOADED_MODEL_STUB);

      expect(line).toBeNull();
    });
  });

  describe('GIVEN a root whose error is binary:not-found', () => {
    it('WHEN the same failure arrives THEN there is no line', () => {
      const line = newFailureLineOf(LOAD_FAILURE_STUB, LOAD_FAILURE_STUB);

      expect(line).toBeNull();
    });

    it('WHEN a failure with the same key and another message arrives THEN there is no line', () => {
      const line = newFailureLineOf(LOAD_FAILURE_STUB, OTHER_MESSAGE);

      expect(line).toBeNull();
    });

    it('WHEN a failure with another key arrives THEN its line is logged', () => {
      const line = newFailureLineOf(LOAD_FAILURE_STUB, UNSUPPORTED);

      expect(line).toBe('turbo version-unsupported: turbo 2.10.4');
    });
  });
});
