import { describe, expect, it } from 'vitest';

import { isHostMessage } from './host-message.util.ts';
import { RUN_VIEW_STUB } from '../test/stubs/details.stub.ts';

const MISSING_STATE = { kind: 'missing', root: '/r', packageName: 'web' };

describe('FEATURE: host message narrowing', () => {
  describe('GIVEN a message the page handles', () => {
    it.each([
      ['a state message', { type: 'state', state: MISSING_STATE }],
      ['a runState message', { type: 'runState', taskId: 'web#build', run: RUN_VIEW_STUB }]
    ])('WHEN it is %s THEN it is accepted', (_label, message) => {
      expect(isHostMessage(message)).toBe(true);
    });
  });

  describe('GIVEN a value the page ignores', () => {
    it.each([
      ['null', null],
      ['a string', 'state'],
      ['an object without a type', {}],
      ['an unknown type', { type: 'nope' }],
      ['a state message without a state', { type: 'state' }],
      ['a state message with a string state', { type: 'state', state: 'x' }],
      ['a runState message with a numeric taskId', { type: 'runState', taskId: 5, run: RUN_VIEW_STUB }],
      ['a runState message without a run', { type: 'runState', taskId: 'web#build' }]
    ])('WHEN it is %s THEN it is rejected', (_label, value) => {
      expect(isHostMessage(value)).toBe(false);
    });
  });
});
