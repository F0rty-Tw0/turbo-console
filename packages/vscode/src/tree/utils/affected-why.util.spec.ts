import { describe, expect, it } from 'vitest';

import { affectedWhyOf } from './affected-why.util.ts';

const WHYS: [string, string, string][] = [
  ['TaskFileChanged', 'packages/a/src/x.ts', 'file changed, packages/a/src/x.ts'],
  ['TaskGlobalFileChanged', 'turbo.json', 'global file changed, turbo.json'],
  ['TaskGlobalDepsChanged', 'pnpm-lock.yaml', 'global dependencies changed, pnpm-lock.yaml'],
  ['TaskAllChanged', 'package is affected', 'package is affected'],
  ['TaskDependencyTaskChanged', 'ui#build', 'depends on ui#build, which is affected'],
  ['TaskPackageDependencyChanged', 'ui', 'dependency ui changed'],
  ['TaskNewKind', 'x', 'TaskNewKind']
];

const FALLBACKS: [string, string][] = [
  ['TaskFileChanged', 'file changed'],
  ['TaskGlobalFileChanged', 'global file changed'],
  ['TaskGlobalDepsChanged', 'global dependencies changed'],
  ['TaskAllChanged', 'all inputs changed'],
  ['TaskDependencyTaskChanged', 'depends on an affected task'],
  ['TaskPackageDependencyChanged', 'a dependency changed']
];

describe('FEATURE: affected why', () => {
  describe('GIVEN a reason with a detail', () => {
    it.each(WHYS)('WHEN the why of %s (%s) is read THEN it is %s', (reason, detail, why) => {
      expect(affectedWhyOf(reason, detail)).toBe(why);
    });
  });

  describe('GIVEN a reason with a null detail', () => {
    it.each(FALLBACKS)('WHEN the detail of %s is null THEN the why is the phrase before the comma alone: %s', (reason, why) => {
      expect(affectedWhyOf(reason, null)).toBe(why);
    });

    it('WHEN an unknown name has a null detail THEN the why is the name itself', () => {
      expect(affectedWhyOf('TaskBrandNew', null)).toBe('TaskBrandNew');
    });
  });

  describe('GIVEN an empty detail', () => {
    it('WHEN the detail of TaskAllChanged or TaskFileChanged is "" THEN the fallback phrase is used', () => {
      expect(affectedWhyOf('TaskAllChanged', '')).toBe('all inputs changed');
      expect(affectedWhyOf('TaskFileChanged', '')).toBe('file changed');
    });
  });
});
