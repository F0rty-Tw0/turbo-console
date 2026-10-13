import type { GraphPackage, GraphTask } from '../../shared/turbo/common/turbo.type.ts';
import {
  AGGREGATE_SUFFIX,
  ATOMIZER_TAG_PREFIX,
  CARRIER_TAG,
  DEFINITIONS_TAG,
  LIVE_TAG,
  RESERVED_GROUPS
} from '../common/atomizer.const.ts';
import type { ClassifiedPackage, ClassifiedTask, ClassifyResult, TaskAtom, TaskNodeKind } from '../common/workspace-model.type.ts';

const nameOf = (fullName: string): string => fullName.slice(fullName.indexOf('#') + 1);

const groupOfTag = (tag: string): string => tag.slice(ATOMIZER_TAG_PREFIX.length);

/** `atomizer:<group>` with a non-empty group that is not reserved; a bare `atomizer:` names no group. */
const isGroupTag = (tag: string): boolean => {
  const isAtomizer = tag.startsWith(ATOMIZER_TAG_PREFIX);
  const group = groupOfTag(tag);
  const isNamed = group !== '';
  const isReserved = RESERVED_GROUPS.includes(group);

  return isAtomizer && isNamed && !isReserved;
};

/** The task's group tags as group names, in sort order. */
const groupsOf = (task: GraphTask): string[] => {
  const groups = task.tags.filter(isGroupTag).map(groupOfTag);

  return groups.toSorted();
};

const isCarrier = (task: GraphTask): boolean => task.tags.includes(CARRIER_TAG);

const isShown = (pkg: GraphPackage): boolean => !pkg.tags.includes(DEFINITIONS_TAG);

/** Groups a task is tagged with, except the ones its own name makes it the umbrella or aggregate of (rule 2.3). */
const fileGroupsOf = (task: GraphTask): string[] => {
  const name = nameOf(task.fullName);
  const isFileTaskOf = (group: string): boolean => name !== group && name !== `${group}${AGGREGATE_SUFFIX}`;

  return groupsOf(task).filter(isFileTaskOf);
};

/** `atom-aggregate` for `<g>--all` and `atom-umbrella` for `<g>` when `<g>` is an atom group of the package. */
const roleOf = (name: string, packageGroups: Set<string>): TaskNodeKind | null => {
  const hasSuffix = name.endsWith(AGGREGATE_SUFFIX);
  const aggregateGroup = name.slice(0, -AGGREGATE_SUFFIX.length);
  const isGroupAggregate = packageGroups.has(aggregateGroup);

  if (hasSuffix && isGroupAggregate) return 'atom-aggregate';

  const isUmbrella = packageGroups.has(name);

  if (isUmbrella) return 'atom-umbrella';

  return null;
};

const atomOf = (kind: TaskNodeKind, group: string, isLive: boolean): TaskAtom | null => {
  if (kind === 'task') return null;

  const atom: TaskAtom = { group, isLive };

  return atom;
};

const groupOf = (name: string, kind: TaskNodeKind, groups: string[]): string => {
  if (kind === 'atom-aggregate') return name.slice(0, -AGGREGATE_SUFFIX.length);

  if (kind === 'atom-umbrella') return name;

  return groups[0] ?? '';
};

/** Rules 2.2–2.4 and 3 for one non-carrier task; `null` drops it. A file task with two group tags adds a warning. */
const classifyTask = (task: GraphTask, packageGroups: Set<string>, warnings: string[]): ClassifiedTask | null => {
  const name = nameOf(task.fullName);
  const groups = groupsOf(task);
  const fileKind: TaskNodeKind = groups.length > 0 ? 'atom-file' : 'task';
  const kind = roleOf(name, packageGroups) ?? fileKind;
  const isPhantom = kind === 'task' && task.command === null;

  if (isPhantom) return null;

  const group = groupOf(name, kind, groups);
  const hasGroupConflict = kind === 'atom-file' && groups.length > 1;

  if (hasGroupConflict) warnings.push(`${task.fullName}: tagged with groups ${groups.join(', ')}; using ${group}`);

  const isLive = kind === 'atom-file' && task.tags.includes(LIVE_TAG);
  const atom = atomOf(kind, group, isLive);
  const rawDependencies = task.directDependencies.items.map((dependency) => dependency.fullName);
  const classified: ClassifiedTask = { id: task.fullName, name, command: task.command, tags: task.tags, rawDependencies, kind, atom };

  return classified;
};

const classifyPackage = (pkg: GraphPackage, warnings: string[]): ClassifiedPackage => {
  const isNotCarrier = (task: GraphTask): boolean => !isCarrier(task);
  const remaining = pkg.tasks.items.filter(isNotCarrier);
  const packageGroups = new Set(remaining.flatMap(fileGroupsOf));
  const classify = (task: GraphTask): ClassifiedTask | null => classifyTask(task, packageGroups, warnings);
  const tasks = remaining.map(classify).filter((task) => task !== null);
  const classified: ClassifiedPackage = { name: pkg.name, path: pkg.path, tags: pkg.tags, tasks };

  return classified;
};

/** Rules 1–3 of spec §4.4: hidden definitions packages, Atomizer classification, phantoms. Input order is kept. */
export const classifyPackages = (packages: GraphPackage[]): ClassifyResult => {
  const warnings: string[] = [];
  const classify = (pkg: GraphPackage): ClassifiedPackage => classifyPackage(pkg, warnings);
  const classified = packages.filter(isShown).map(classify);
  const result: ClassifyResult = { packages: classified, warnings };

  return result;
};
