import { describe, expect, it } from 'vitest';

import { affectedDetailOf } from './affected-detail.util.ts';
import type { ChangedReason } from '../../shared/turbo/common/turbo.type.ts';

const reasonOf = (typename: string, fields: object = {}): ChangedReason => {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- GraphQL's own `__typename` key, copied from turbo's output.
  const reason: ChangedReason = { __typename: typename, ...fields };

  return reason;
};

describe('FEATURE: affected task detail', () => {
  describe('GIVEN a reason carrying the fields turbo names for its kind', () => {
    it.each([
      ['TaskFileChanged', { filePath: 'packages/a/src/x.ts' }, 'packages/a/src/x.ts'],
      ['TaskGlobalFileChanged', { filePath: 'turbo.json' }, 'turbo.json'],
      ['TaskGlobalDepsChanged', { filePath: 'pnpm-lock.yaml' }, 'pnpm-lock.yaml'],
      ['TaskPackageDependencyChanged', { packageName: 'ui' }, 'ui'],
      ['TaskDependencyTaskChanged', { packageName: 'ui', taskName: 'build' }, 'ui#build'],
      ['TaskAllChanged', { description: 'package is affected' }, 'package is affected'],
      ['TaskAllChanged', { description: '' }, '']
    ])('WHEN the detail of %s is read THEN it is the spec value', (typename, fields, detail) => {
      const reason = reasonOf(typename, fields);

      expect(affectedDetailOf(reason)).toBe(detail);
    });
  });

  describe('GIVEN a reason without the fields of its kind', () => {
    it.each([
      ['TaskFileChanged', {}],
      ['TaskFileChanged', { filePath: null }],
      ['TaskGlobalFileChanged', {}],
      ['TaskGlobalDepsChanged', {}],
      ['TaskPackageDependencyChanged', {}],
      ['TaskAllChanged', {}],
      ['TaskAllChanged', { description: null }],
      ['TaskDependencyTaskChanged', {}],
      ['TaskDependencyTaskChanged', { packageName: 'ui' }],
      ['TaskDependencyTaskChanged', { taskName: 'build' }]
    ])('WHEN the detail of %s with %o is read THEN it is null', (typename, fields) => {
      const reason = reasonOf(typename, fields);

      expect(affectedDetailOf(reason)).toBeNull();
    });
  });

  describe('GIVEN a name turbo adds later', () => {
    it('WHEN the detail of TaskNewKind carrying filePath is read THEN it is null', () => {
      const reason = reasonOf('TaskNewKind', { filePath: 'a.ts' });

      expect(affectedDetailOf(reason)).toBeNull();
    });
  });

  describe('GIVEN a TaskFileChanged carrying only the wrong field', () => {
    it('WHEN the detail is read THEN it is null', () => {
      const reason = reasonOf('TaskFileChanged', { packageName: 'ui' });

      expect(affectedDetailOf(reason)).toBeNull();
    });
  });
});
