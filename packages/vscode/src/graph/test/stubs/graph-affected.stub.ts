import type { GraphAffected } from '@turbo-console/webview-ui';

import type { AffectedEntry, AffectedView } from '../../../tree/common/affected.type.ts';

const AFFECTED_ENTRIES_STUB: ReadonlyMap<string, AffectedEntry> = new Map<string, AffectedEntry>([
  ['a#build', { mark: 'changed', line: 'Affected (task level): file changed' }],
  ['web#build', { mark: 'dependency', line: 'Affected (task level): depends on a#build' }],
  ['gone#x', { mark: 'changed', line: 'Affected (task level): file changed' }]
]);

/** `a#build` changed, `web#build` dependency, and `gone#x`, which `GRAPH_TASKS_STUB` does not list. */
export const AFFECTED_VIEW_STUB: AffectedView = { settledAt: 1, mode: 'task', tasks: AFFECTED_ENTRIES_STUB };

const TASK_MARKS_STUB: GraphAffected['tasks'] = { 'a#build': 'changed', 'web#build': 'dependency' };

/** What `affectedOf` makes of `AFFECTED_VIEW_STUB` over `GRAPH_TASKS_STUB`. */
export const AFFECTED_MARKS_STUB: GraphAffected = { mode: 'task', tasks: TASK_MARKS_STUB };

/** Another view: only `web#lint` is marked, at package level. */
export const OTHER_AFFECTED_VIEW_STUB: AffectedView = {
  settledAt: 2,
  mode: 'package',
  tasks: new Map<string, AffectedEntry>([['web#lint', { mark: 'changed', line: 'Affected (package level): 1 of 1 tasks' }]])
};

const LINT_MARKS_STUB: GraphAffected['tasks'] = { 'web#lint': 'changed' };

/** What `affectedOf` makes of `OTHER_AFFECTED_VIEW_STUB` over `GRAPH_TASKS_STUB`. */
export const OTHER_AFFECTED_MARKS_STUB: GraphAffected = { mode: 'package', tasks: LINT_MARKS_STUB };
