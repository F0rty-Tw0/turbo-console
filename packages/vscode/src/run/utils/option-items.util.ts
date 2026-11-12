import type { TaskNode } from '@turbo-console/core';

import type { OptionItem, RunOption } from '../common/run-options.type.ts';

const item = (label: string, description: string, option: RunOption): OptionItem => {
  const result: OptionItem = { label, description, option };

  return result;
};

const FORCE = item('Without cache', '--force', 'force');
const ONLY = item('Only this task', '--only, skips its dependencies', 'only');
const KEEP = item('Keep going after a failure', '--continue=dependencies-successful', 'continue');
const CONCURRENCY = item('Concurrency…', '--concurrency, asks for a value', 'concurrency');

export const optionItemsOf = (task: TaskNode): OptionItem[] => {
  const isGroup = task.kind === 'atom-umbrella' || task.kind === 'atom-aggregate';

  if (isGroup) return [FORCE, KEEP, CONCURRENCY];

  const args = item('Extra arguments…', `after --, passed to every ${task.name} task in the run`, 'passThrough');

  return [FORCE, ONLY, KEEP, CONCURRENCY, args];
};
