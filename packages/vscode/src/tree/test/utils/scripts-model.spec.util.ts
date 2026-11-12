import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

const SCRIPT_NAMES = ['zz-s1', 'zz-s2'];

const EVERY = 3;

const scriptFrom = (pkg: PackageNode, template: TaskNode, name: string): TaskNode => {
  const script: TaskNode = {
    ...template,
    id: `${pkg.name}#${name}`,
    name,
    kind: 'task',
    command: 'node -e 0',
    isTurboTask: false,
    persistent: false,
    dependencies: [],
    description: null
  };

  return script;
};

const withTwoScripts = (pkg: PackageNode): PackageNode => {
  const [template] = pkg.tasks;

  if (template === undefined) throw new Error(`bench package ${pkg.name} has no task to copy`);

  const scripts = SCRIPT_NAMES.map((name) => scriptFrom(pkg, template, name));
  const edited: PackageNode = { ...pkg, tasks: [...pkg.tasks, ...scripts] };

  return edited;
};

/** The monorepo root package, which repo-gen lists with no tasks; it is left out of the every-third count. */
const ROOT = '//';

/**
 * Spec 1c-b §4.13: a copy of `model` where every third package other than the root `//`, in model order, gains two
 * scripts `zz-s1` and `zz-s2` (repo-gen writes `package.json` scripts for turbo tasks only), so the scripts bench has
 * script rows to build. Skipping the root keeps the same packages scripted as before the root joined the model.
 */
export const withScripts = (model: WorkspaceModel): WorkspaceModel => {
  const isMember = (pkg: PackageNode): boolean => pkg.name !== ROOT;
  const isPicked = (_pkg: PackageNode, index: number): boolean => index % EVERY === 0;
  const picked = new Set(model.packages.filter(isMember).filter(isPicked));
  const edit = (pkg: PackageNode): PackageNode => {
    const isPickedPackage = picked.has(pkg);

    if (!isPickedPackage) return pkg;

    return withTwoScripts(pkg);
  };
  const packages = model.packages.map(edit);
  const copy: WorkspaceModel = { ...model, packages };

  return copy;
};
