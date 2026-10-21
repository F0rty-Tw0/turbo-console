import type { Closure } from '../common/closure.type.ts';

/** The status line: `<name>: <n> dependencies, <m> dependents`, `''` with no selection. */
export const selectionText = (selected: string | null, closure: Closure | null): string => {
  if (selected === null || closure === null) return '';

  return `${selected}: ${closure.dependencies.size} dependencies, ${closure.dependents.size} dependents`;
};
