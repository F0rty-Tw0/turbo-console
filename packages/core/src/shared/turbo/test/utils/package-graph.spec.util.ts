import type { PackageGraph } from '../../common/turbo.type.ts';
import type { TurboTaskRef } from '../common/turbo.type.ts';

const graphTasks = (graph: PackageGraph): TurboTaskRef[] => {
  const packages = graph.data.packageGraph.nodes.items;

  return packages.flatMap((pkg) => pkg.tasks.items);
};

const fullNameOf = (task: TurboTaskRef): string => task.fullName;

/** Sorted package names turbo lists; `packageGraph.nodes` already leaves out the root `//`. */
export const graphPackageNames = (graph: PackageGraph): string[] => {
  const names = graph.data.packageGraph.nodes.items.map((pkg) => pkg.name);

  return names.toSorted();
};

/** Sorted `fullName`s of the tasks turbo reports with a command. */
export const commandTaskNames = (graph: PackageGraph): string[] => {
  const hasCommand = (task: TurboTaskRef): boolean => task.command !== null;
  const names = graphTasks(graph).filter(hasCommand).map(fullNameOf);

  return names.toSorted();
};

/** Sorted `fullName`s of the tasks turbo reports with neither a command nor a script. */
export const commandlessTaskNames = (graph: PackageGraph): string[] => {
  const isCommandless = (task: TurboTaskRef): boolean => task.command === null && task.script === null;
  const names = graphTasks(graph).filter(isCommandless).map(fullNameOf);

  return names.toSorted();
};
