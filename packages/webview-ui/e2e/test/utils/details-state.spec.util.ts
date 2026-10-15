import type { PackageDetails, TaskCard } from '../../../src/bridge/common/details-state.type.ts';
import { PACKAGE_DETAILS_STUB, TASK_CARD_STUB } from '../stubs/details-state.stub.ts';

const cardNamed = (name: string): TaskCard => {
  const card: TaskCard = { ...TASK_CARD_STUB, taskId: `web#${name}`, name };

  return card;
};

const taskNameAt = (_: unknown, index: number): string => `t${String(index).padStart(2, '0')}`;

/** `count` sortable task names: t00, t01, … */
export const taskNames = (count: number): string[] => Array.from({ length: count }, taskNameAt);

/** A package with one card per name, in the given order. */
export const packageWithTasks = (names: string[]): PackageDetails => {
  const tasks = names.map(cardNamed);
  const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks };

  return state;
};
