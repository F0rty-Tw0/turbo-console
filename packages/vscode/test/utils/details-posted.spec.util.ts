import type { PackageDetails, RunView } from '@turbo-console/webview-ui';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** The package states among what was posted to the panel of `packageName`, oldest first. */
export const packageStates = (api: TurboConsoleApi, root: string, packageName: string): PackageDetails[] => {
  const posted = api.details.posted(root, packageName);
  const states: PackageDetails[] = [];

  for (const message of posted) {
    if (message.type === 'state' && message.state.kind === 'package') states.push(message.state);
  }

  return states;
};

/** The state of the last message posted to the panel; throws when that message is not a package state. */
export const lastPackageState = (api: TurboConsoleApi, root: string, packageName: string): PackageDetails => {
  const posted = api.details.posted(root, packageName);
  const last = posted.at(-1);

  if (last?.type !== 'state') throw new Error(`the last message to ${packageName} is not a state`);

  const { state } = last;

  if (state.kind !== 'package') throw new Error(`the last state of ${packageName} is not a package`);

  return state;
};

/** The last `runState` posted for `taskId`; throws when none was. */
export const lastRunView = (api: TurboConsoleApi, root: string, packageName: string, taskId: string): RunView => {
  const posted = api.details.posted(root, packageName);
  const views: RunView[] = [];

  for (const message of posted) {
    if (message.type === 'runState' && message.taskId === taskId) views.push(message.run);
  }

  const last = views.at(-1);

  if (last === undefined) throw new Error(`no runState was posted for ${taskId}`);

  return last;
};

/** Whether the panel of `packageName` is open and shown. */
export const isPanelShown = (api: TurboConsoleApi, root: string, packageName: string): boolean => {
  const panels = api.details.panels();
  const panel = panels.find((candidate) => candidate.root === root && candidate.packageName === packageName);

  return panel?.visible === true;
};
