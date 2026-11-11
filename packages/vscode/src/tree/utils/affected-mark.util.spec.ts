import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { affectedMarkOf } from './affected-mark.util.ts';
import { AFFECTED_REQUIRED_DETAIL } from '../common/affected.const.ts';
import type { AffectedMark, AffectedPackageFlags } from '../common/affected.type.ts';
import { turboTaskOf } from '../test/utils/prediction-model.spec.util.ts';

const NONE: AffectedPackageFlags = { hasFileSibling: false, hasAffectedUpstream: false };
const SIBLING: AffectedPackageFlags = { hasFileSibling: true, hasAffectedUpstream: false };
const UPSTREAM: AffectedPackageFlags = { hasFileSibling: false, hasAffectedUpstream: true };
const BOTH: AffectedPackageFlags = { hasFileSibling: true, hasAffectedUpstream: true };

type MarkCase = {
  readonly reason: string;
  readonly kind: TaskNode['kind'];
  readonly detail: string | null;
  readonly flags: AffectedPackageFlags;
  readonly mark: AffectedMark;
};

type MarkRow = [string, TaskNode['kind'], string | null, AffectedPackageFlags, AffectedMark];

const ROWS: MarkRow[] = [
  ['TaskFileChanged', 'task', null, NONE, 'changed'],
  ['TaskGlobalFileChanged', 'task', null, NONE, 'changed'],
  ['TaskGlobalDepsChanged', 'task', null, NONE, 'changed'],
  ['TaskBrandNew', 'task', null, NONE, 'changed'],
  ['TaskAllChanged', 'task', null, SIBLING, 'changed'],
  ['TaskAllChanged', 'task', AFFECTED_REQUIRED_DETAIL, SIBLING, 'changed'],
  ['TaskAllChanged', 'task', AFFECTED_REQUIRED_DETAIL, NONE, 'dependency'],
  ['TaskAllChanged', 'task', AFFECTED_REQUIRED_DETAIL, UPSTREAM, 'dependency'],
  ['TaskAllChanged', 'task', 'package is affected', UPSTREAM, 'dependency'],
  ['TaskAllChanged', 'task', 'package is affected', BOTH, 'changed'],
  ['TaskAllChanged', 'task', 'package is affected', NONE, 'changed'],
  ['TaskAllChanged', 'task', null, NONE, 'changed'],
  ['TaskDependencyTaskChanged', 'task', null, SIBLING, 'dependency'],
  ['TaskPackageDependencyChanged', 'task', null, NONE, 'dependency'],
  ['TaskFileChanged', 'atom-umbrella', null, NONE, 'dependency'],
  ['TaskAllChanged', 'atom-aggregate', null, SIBLING, 'dependency']
];

const MARKS = ROWS.map(([reason, kind, detail, flags, mark]): MarkCase => {
  const row: MarkCase = { reason, kind, detail, flags, mark };

  return row;
});

describe('FEATURE: affected mark', () => {
  describe('GIVEN a reason, a detail, a task kind and the package flags', () => {
    it.each(MARKS)(
      'WHEN $reason on a $kind task (detail $detail, flags $flags) THEN the mark is $mark',
      ({ reason, kind, detail, flags, mark }) => {
        const task = turboTaskOf('@fx/a', 'build', { kind });

        expect(affectedMarkOf(task, reason, detail, flags)).toBe(mark);
      }
    );
  });
});
