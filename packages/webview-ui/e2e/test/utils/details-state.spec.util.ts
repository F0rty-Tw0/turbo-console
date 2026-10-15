import type { PackageDetails, TaskCard } from '../../../src/bridge/common/details-state.type.ts';
import { PACKAGE_DETAILS_STUB, TASK_CARD_STUB } from '../stubs/details-state.stub.ts';

const cardNamed = (name: string): TaskCard => {
  const card: TaskCard = { ...TASK_CARD_STUB, taskId: `web#${name}`, name };

  return card;
};

/** A package with one card per name, in the given order. */
export const packageWithTasks = (names: string[]): PackageDetails => {
  const tasks = names.map(cardNamed);
  const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks };

  return state;
};
