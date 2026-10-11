import type { Manifest, ManifestPackage, ManifestTask, PackageRole, TaskKind } from '@turbo-console/repo-gen';

/** Sorted `fullName`s of the manifest tasks whose kind is one of `kinds`. */
export const manifestTaskNames = (manifest: Manifest, kinds: TaskKind[]): string[] => {
  const isWanted = (task: ManifestTask): boolean => kinds.includes(task.kind);
  const names = manifest.tasks.filter(isWanted).map((task) => task.fullName);

  return names.toSorted();
};

/** Sorted `fullName`s of the non-phantom tasks of one package. */
export const packageTaskNames = (manifest: Manifest, packageName: string): string[] => {
  const isOwnTask = (task: ManifestTask): boolean => task.packageName === packageName && task.kind !== 'phantom';
  const names = manifest.tasks.filter(isOwnTask).map((task) => task.fullName);

  return names.toSorted();
};

/** The first package with `role`; throws when the manifest has none, so a generator change cannot skip a scenario. */
export const packageWithRole = (manifest: Manifest, role: PackageRole): ManifestPackage => {
  const found = manifest.packages.find((pkg) => pkg.role === role);

  if (found === undefined) throw new Error(`manifest has no ${role} package`);

  return found;
};

/** The first `regular` package no other package depends on: not the hub, not an atom package. */
export const leafPackage = (manifest: Manifest): ManifestPackage => {
  const dependedOn = new Set(manifest.packages.flatMap((pkg) => pkg.dependencies));
  const isLeaf = (pkg: ManifestPackage): boolean => pkg.role === 'regular' && !dependedOn.has(pkg.name);
  const found = manifest.packages.find(isLeaf);

  if (found === undefined) throw new Error('manifest has no leaf package');

  return found;
};
