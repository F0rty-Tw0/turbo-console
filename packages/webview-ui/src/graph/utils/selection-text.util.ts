import { pluralOf } from './plural.util.ts';
import type { Closure } from '../common/closure.type.ts';
import type { Neighbours } from '../common/neighbours.type.ts';

/** The status line of a selected package: `<name> · N dependencies, M direct · N dependents, M direct`. */
export const selectionText = (name: string, closure: Closure, direct: Neighbours): string => {
  const dependencies = pluralOf(closure.dependencies.size, 'dependency', 'dependencies');
  const dependents = pluralOf(closure.dependents.size, 'dependent', 'dependents');

  return `${name} · ${dependencies}, ${direct.dependencies.length} direct · ${dependents}, ${direct.dependents.length} direct`;
};
