import { describe, expect, it } from 'vitest';

import { layoutTimeoutOf } from './layout-timeout.util.ts';
import type { ProbeHost } from '../common/graph-probe.type.ts';
import { FALLBACK_TIMEOUT_MS } from '../common/graph.const.ts';

describe('FEATURE: layoutTimeoutOf', () => {
  describe.each([
    ['no timeout', {}],
    ["the string '30000'", { tcLayoutTimeoutMs: '30000' }],
    ['0', { tcLayoutTimeoutMs: 0 }],
    ['a negative number', { tcLayoutTimeoutMs: -1 }],
    ['NaN', { tcLayoutTimeoutMs: Number.NaN }],
    ['a delay setTimeout clamps (2^31 ms)', { tcLayoutTimeoutMs: 2_147_483_648 }],
    ['Infinity', { tcLayoutTimeoutMs: Number.POSITIVE_INFINITY }]
  ])('GIVEN %s on the host', (_name, host: ProbeHost) => {
    it('WHEN the timeout is read THEN it is the production fallback timeout', () => {
      expect(layoutTimeoutOf(host)).toBe(FALLBACK_TIMEOUT_MS);
    });
  });

  describe('GIVEN 30000 on the host', () => {
    it('WHEN the timeout is read THEN it is 30000', () => {
      const host: ProbeHost = { tcLayoutTimeoutMs: 30_000 };

      expect(layoutTimeoutOf(host)).toBe(30_000);
    });
  });
});
