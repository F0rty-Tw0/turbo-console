import { describe, expect, it } from 'vitest';

import { secondsText, settledMatchOf } from './run-result.util.ts';
import type { RunEntry } from '../common/run.type.ts';
import { RUN_ENTRY_STUB } from '../test/stubs/run.stub.ts';

const MATCH = { cache: 'HIT' as const, durationMs: 3200 };

describe('FEATURE: settled match of a run', () => {
  describe('GIVEN a run whose match is set', () => {
    it('WHEN matching has finished THEN the match is returned', () => {
      const entry: RunEntry = { ...RUN_ENTRY_STUB, match: MATCH, matching: false };

      expect(settledMatchOf(entry)).toBe(MATCH);
    });

    it('WHEN matching is still in progress THEN there is no match yet', () => {
      const entry: RunEntry = { ...RUN_ENTRY_STUB, match: MATCH, matching: true };

      expect(settledMatchOf(entry)).toBeNull();
    });
  });

  describe('GIVEN a run with no match', () => {
    it('WHEN matching has finished THEN there is no match', () => {
      expect(settledMatchOf(RUN_ENTRY_STUB)).toBeNull();
    });
  });
});

describe('FEATURE: seconds text', () => {
  it.each([
    [3200, '3.2s'],
    [400, '0.4s'],
    [0, '0.0s'],
    [12_340, '12.3s']
  ])('GIVEN %d ms WHEN written THEN it reads %s', (durationMs, text) => {
    expect(secondsText(durationMs)).toBe(text);
  });
});
