import type { AffectedView } from '../../common/affected.type.ts';

export const AFFECTED_SETTLED_STUB: number = new Date(2026, 10, 11, 14, 5).getTime();

export const CHANGED_LINE_STUB: string = 'Affected (task level): file changed, src/a.ts (as of 14:05)';

export const DEP_LINE_STUB: string = 'Affected (task level): depends on lib#build, which is affected (as of 14:05)';

/** `a#build` is marked changed, `a#test` is marked dependency; every other task is not affected. */
export const AFFECTED_VIEW_STUB: AffectedView = {
  settledAt: AFFECTED_SETTLED_STUB,
  mode: 'task',
  tasks: new Map([
    ['a#build', { mark: 'changed', line: CHANGED_LINE_STUB }],
    ['a#test', { mark: 'dependency', line: DEP_LINE_STUB }]
  ])
};
