/* eslint-disable @typescript-eslint/naming-convention -- the probe's window names are the e2e contract */

import { describe, expect, it } from 'vitest';

import { layoutTimeoutOf } from './layout-timeout.util.ts';
import type { ProbeHost } from '../common/graph-probe.type.ts';
import { FALLBACK_TIMEOUT_MS } from '../common/graph.const.ts';

describe('FEATURE: layoutTimeoutOf', () => {
  it.each([
    ['no timeout', {}],
    ["the string '30000'", { __tcLayoutTimeoutMs: '30000' }],
    ['0', { __tcLayoutTimeoutMs: 0 }],
    ['a negative number', { __tcLayoutTimeoutMs: -1 }],
    ['NaN', { __tcLayoutTimeoutMs: Number.NaN }],
    ['Infinity', { __tcLayoutTimeoutMs: Number.POSITIVE_INFINITY }]
  ])('GIVEN %s on the host WHEN the timeout is read THEN it is the production fallback timeout', (_name, host: ProbeHost) => {
    expect(layoutTimeoutOf(host)).toBe(FALLBACK_TIMEOUT_MS);
  });

  it('GIVEN 30000 on the host WHEN the timeout is read THEN it is 30000', () => {
    const host: ProbeHost = { __tcLayoutTimeoutMs: 30_000 };

    expect(layoutTimeoutOf(host)).toBe(30_000);
  });
});
