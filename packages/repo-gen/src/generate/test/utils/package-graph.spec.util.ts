import type { PackagePlan } from '../../common/fixture.type.ts';

export const dependentsOf = (packages: PackagePlan[], name: string): PackagePlan[] => {
  return packages.filter((pkg) => pkg.dependencies.includes(name));
};

export const upwardEdges = (packages: PackagePlan[]): string[] => {
  const levelByName = new Map(packages.map((pkg) => [pkg.name, pkg.level]));

  return packages.flatMap((pkg) => {
    const isUpward = (dependency: string): boolean => (levelByName.get(dependency) ?? Infinity) >= pkg.level;

    return pkg.dependencies.filter(isUpward).map((dependency) => `${pkg.name} -> ${dependency}`);
  });
};

export const leafPackages = (packages: PackagePlan[], level: number): PackagePlan[] => {
  const hasNoDependents = (pkg: PackagePlan): boolean => dependentsOf(packages, pkg.name).length === 0;

  return packages.filter((pkg) => pkg.role === 'regular' && pkg.level === level && hasNoDependents(pkg));
};
