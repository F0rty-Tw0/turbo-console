import type { TaskDefinition } from '@turbo-console/core';

import type { MissingPackage, PackageDetails, RunView, TaskCard } from '../../../src/bridge/common/details-state.type.ts';

export const RUN_VIEW_STUB: RunView = {
  iconId: 'tools',
  colorVar: null,
  text: '',
  isRunning: false,
  elapsedMs: null,
  isSpinning: false,
  isIdle: true
};

const NOT_IDLE_RUN_VIEW: RunView = { ...RUN_VIEW_STUB, isIdle: false };

export const RUNNING_RUN_VIEW_STUB: RunView = {
  ...NOT_IDLE_RUN_VIEW,
  iconId: 'sync',
  text: 'running',
  isRunning: true,
  elapsedMs: 0,
  isSpinning: true
};

export const PASSED_RUN_VIEW_STUB: RunView = {
  ...NOT_IDLE_RUN_VIEW,
  iconId: 'pass',
  colorVar: '--vscode-testing-iconPassed',
  text: 'passed'
};

export const STOPPED_RUN_VIEW_STUB: RunView = {
  ...NOT_IDLE_RUN_VIEW,
  iconId: 'debug-stop',
  colorVar: '--vscode-disabledForeground',
  text: 'stopped · 3.0s'
};

export const TASK_DEFINITION_STUB: TaskDefinition = {
  inputs: ['src/**'],
  outputs: ['dist/**'],
  dependsOn: ['^build'],
  cache: true,
  persistent: true,
  env: ['API_URL']
};

export const TASK_CARD_STUB: TaskCard = {
  taskId: 'web#build',
  name: 'build',
  command: 'tsc -b',
  description: 'Builds the web app',
  dependents: ['docs#build'],
  definition: TASK_DEFINITION_STUB,
  cacheStatus: 'HIT',
  isTurboTask: true,
  persistent: false,
  runCommand: null,
  tool: null,
  run: RUN_VIEW_STUB
};

const tasks = [TASK_CARD_STUB];

export const PACKAGE_DETAILS_STUB: PackageDetails = {
  kind: 'package',
  root: '/repo',
  packageName: 'web',
  label: 'web',
  path: 'apps/web',
  tags: ['scope:web', 'type:app'],
  tasks,
  dryRun: 'ready',
  reloadError: null,
  scriptsShown: true,
  hiddenScriptCount: 0,
  taskGraph: true
};

export const MISSING_PACKAGE_STUB: MissingPackage = { kind: 'missing', root: '/repo', packageName: 'web', label: null };

/** Repo text that would run script if the page ever wrote it as HTML. */
export const HOSTILE_NAME_STUB: string = '<img src=x onerror=alert(1)>';
