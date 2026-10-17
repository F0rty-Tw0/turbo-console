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
  run: RUN_VIEW_STUB
};

const tasks = [TASK_CARD_STUB];

export const PACKAGE_DETAILS_STUB: PackageDetails = {
  kind: 'package',
  root: '/repo',
  packageName: 'web',
  path: 'apps/web',
  tags: ['scope:web', 'type:app'],
  tasks,
  dryRun: 'ready',
  reloadError: null,
  scriptsShown: true,
  hiddenScriptCount: 0
};

export const MISSING_PACKAGE_STUB: MissingPackage = { kind: 'missing', root: '/repo', packageName: 'web' };

/** Repo text that would run script if the page ever wrote it as HTML. */
export const HOSTILE_NAME_STUB: string = '<img src=x onerror=alert(1)>';
