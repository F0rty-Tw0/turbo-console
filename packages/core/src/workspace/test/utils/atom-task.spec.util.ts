import { TASK_NODE_STUB } from '../../../run-summary/test/stubs/task-node.stub.ts';
import type { TaskAtom, TaskNode, TaskNodeKind } from '../../common/workspace-model.type.ts';

export const atomOf = (group: string, isLive = false): TaskAtom => {
  const atom: TaskAtom = { group, isLive };

  return atom;
};

export const atomTask = (packageName: string, name: string, kind: TaskNodeKind, atom: TaskAtom): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${packageName}#${name}`, name, kind, atom };

  return task;
};

/** The umbrella task of atom group `group` in package `packageName`. */
export const umbrellaOf = (packageName: string, group: string): TaskNode =>
  atomTask(packageName, group, 'atom-umbrella', atomOf(group));

/** The file task of spec `spec` in atom group `group` of package `packageName`. */
export const fileOf = (packageName: string, group: string, spec: string, live = false): TaskNode =>
  atomTask(packageName, `${group}--${spec}`, 'atom-file', atomOf(group, live));

/** The file task of spec `spec` in group `e2e-ci` of package `a`. */
export const ciFileOf = (spec: string, live = false): TaskNode => fileOf('a', 'e2e-ci', spec, live);
