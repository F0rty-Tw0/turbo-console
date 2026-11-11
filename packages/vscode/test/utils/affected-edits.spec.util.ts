import type { AffectedEdits } from '../common/affected.type.ts';
import type { ShownManifest, ShownPackage, ShownTask } from '../common/launch.type.ts';

const missingRole = (role: keyof AffectedEdits): Error =>
  new Error(`affectedEditsOf: the manifest has no package for the ${role} role`);

const isRegular = (pkg: ShownPackage): boolean => pkg.role === 'regular';

export const isAtomTest = (pkg: ShownPackage): boolean => pkg.role === 'atom-test';

/** Whether the manifest shows a plain `build` task for `pkg`. */
const showsBuild = (manifest: ShownManifest, pkg: ShownPackage): boolean => {
  const buildId = `${pkg.name}#build`;
  const isShownBuild = (task: ShownTask): boolean => {
    const isBuild = task.fullName === buildId;
    const isShownTask = task.visible && task.kind === 'task';

    return isBuild && isShownTask;
  };

  return manifest.tasks.some(isShownBuild);
};

/**
 * Picks the three packages of the affected edit set from the manifest alone: `leaf` is the first regular package that no
 * package depends on (core's `leafPackage` rule), `readme` the first regular package with no dependency and no dependent
 * that shows a `build`, `atomDependency` the first dependency of the first atom test package. Throws naming the role
 * when a rule finds none, or naming both when `leaf` and `readme` are one package (an isolated package also passes the
 * leaf rule), so a fixture that changes shape fails here and not as a wrong row later.
 */
export const affectedEditsOf = (manifest: ShownManifest): AffectedEdits => {
  const dependedOn = new Set(manifest.packages.flatMap((pkg) => pkg.dependencies));
  const regular = manifest.packages.filter(isRegular);
  const isLeaf = (pkg: ShownPackage): boolean => !dependedOn.has(pkg.name);
  const isIsolated = (pkg: ShownPackage): boolean => {
    const isFree = isLeaf(pkg) && pkg.dependencies.length === 0;

    return isFree && showsBuild(manifest, pkg);
  };
  const leaf = regular.find(isLeaf);
  const readme = regular.find(isIsolated);
  const atomTest = manifest.packages.find(isAtomTest);
  const dependencyName = atomTest?.dependencies.at(0);
  const atomDependency = manifest.packages.find((pkg) => pkg.name === dependencyName);

  if (leaf === undefined) throw missingRole('leaf');

  if (readme === undefined) throw missingRole('readme');

  if (leaf === readme) throw new Error(`affectedEditsOf: leaf and readme are both ${leaf.name}; the edit set needs two packages`);

  if (atomDependency === undefined) throw missingRole('atomDependency');

  const edits: AffectedEdits = { readme, leaf, atomDependency };

  return edits;
};
