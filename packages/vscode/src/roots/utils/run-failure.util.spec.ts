import { TurboException } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { runFailureOf } from './run-failure.util.ts';

describe('FEATURE: failure of a broken run port', () => {
  it('GIVEN a plain Error WHEN converted THEN it is a failed load carrying the message', () => {
    const failure = runFailureOf(new Error('boom'));

    expect(failure).toStrictEqual({ kind: 'error', stage: 'load', error: new TurboException('failed', 'boom'), logText: 'boom' });
  });

  it('GIVEN a TurboException with a cause WHEN converted THEN the message is its log line and the cause is dropped', () => {
    const cause = new Error('secret stderr');
    const thrown = new TurboException('io', 'disk', { cause });

    const failure = runFailureOf(thrown);

    expect(failure.error.message).toBe('turbo io: disk');
    expect(failure.error.cause).toBeUndefined();
  });
});
