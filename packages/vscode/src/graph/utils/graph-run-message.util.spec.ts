import { describe, expect, it } from 'vitest';

import { parseGraphMessage } from './graph-message.util.ts';

describe('FEATURE: parseGraphMessage for runTask and stopTask', () => {
  describe('GIVEN a runTask or stopTask post', () => {
    it.each([
      [{ type: 'runTask', taskId: 'a#build', noCache: false }],
      [{ type: 'runTask', taskId: 'a#build', noCache: true }],
      [{ type: 'stopTask', taskId: 'a#build' }],
      [{ type: 'runTask', taskId: 'x'.repeat(1024), noCache: false }]
    ])('WHEN it is %j THEN it passes unchanged', (raw) => {
      const parsed = parseGraphMessage(raw);

      expect(parsed).toStrictEqual(raw);
    });

    it.each([
      ['a taskId of 1025 characters', { type: 'runTask', taskId: 'x'.repeat(1025), noCache: false }],
      ['a numeric taskId', { type: 'runTask', taskId: 7, noCache: false }],
      ['no taskId', { type: 'stopTask' }],
      ['a string noCache', { type: 'runTask', taskId: 'a#build', noCache: 'yes' }],
      ['no noCache', { type: 'runTask', taskId: 'a#build' }]
    ])('WHEN it has %s THEN it is null', (_label, raw) => {
      const parsed = parseGraphMessage(raw);

      expect(parsed).toBeNull();
    });

    it('WHEN runTask carries a packageName THEN the key is stripped', () => {
      const parsed = parseGraphMessage({ type: 'runTask', taskId: 'a#build', noCache: false, packageName: 'evil' });

      expect(parsed).toStrictEqual({ type: 'runTask', taskId: 'a#build', noCache: false });
    });
  });
});
