import type { PackageEdge, PackageNode, TaskAtom, TaskNode, WorkspaceModel } from '../../../workspace/common/workspace-model.type.ts';

const LIVE_ATOM: TaskAtom = { group: 'e2e', isLive: true };

const BUILD_TASK: TaskNode = {
  id: 'web#build',
  name: 'build',
  command: 'vite build',
  description: 'web build',
  tags: [],
  dependencies: [],
  kind: 'task',
  atom: null,
  isTurboTask: true
};

const FILE_TASK: TaskNode = {
  id: 'web#e2e--a.spec.ts',
  name: 'e2e--a.spec.ts',
  command: 'playwright test a.spec.ts',
  description: null,
  tags: ['atomizer:e2e', 'atomizer:live'],
  dependencies: ['web#build'],
  kind: 'atom-file',
  atom: LIVE_ATOM,
  isTurboTask: true
};

const WEB_TASKS = [BUILD_TASK, FILE_TASK];

const WEB_PACKAGE: PackageNode = { name: 'web', path: 'apps/web', tags: ['app'], tasks: WEB_TASKS };

const UI_PACKAGE: PackageNode = { name: 'ui', path: 'packages/ui', tags: [], tasks: [] };

const WEB_TO_UI: PackageEdge = { source: 'web', target: 'ui', kind: 'dependency' };

const PACKAGES = [UI_PACKAGE, WEB_PACKAGE];

const EDGES = [WEB_TO_UI];

/** A small model holding every field kind: an atom and a plain task, a description and a null one, an edge and a warning. */
export const WORKSPACE_MODEL_STUB: WorkspaceModel = {
  root: '/repo',
  turboVersion: '2.11.7',
  affectedMode: 'task',
  packages: PACKAGES,
  edges: EDGES,
  warnings: ['turbo.jsonc: x']
};
