import { folderTitleOf, groupLabelOf } from './controls-text.util.ts';
import { byCodeUnit } from './folder-group.util.ts';
import { ownerTextOf } from './owner-text.util.ts';
import { checkStateOf } from './task-check.util.ts';
import { matchesTaskSearch } from './task-choice.util.ts';
import { chooseFolderLabelOf, chooseProjectLabelOf, chooseTaskLabelOf } from './task-text.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';
import type { GroupLine, ProjectLine, TaskGridFacts, TaskGridOpen, TaskLine } from '../common/task-grid.type.ts';

/** One package and the pool tasks it owns. */
type Project = { readonly name: string; readonly tasks: GraphTask[] };

/** The projects of one folder, every one of them, listed or not. */
type Bucket = { readonly folder: string; readonly projects: Project[] };

export const folderKeyOf = (folder: string): string => `folder:${folder}`;

export const projectKeyOf = (name: string): string => `project:${name}`;

const byProjectName = (left: Project, right: Project): number => {
  if (left.name === right.name) return 0;

  if (left.name === ROOT_TASK_PACKAGE) return -1;

  if (right.name === ROOT_TASK_PACKAGE) return 1;

  return byCodeUnit(left.name, right.name);
};

const groupedBy = <TItem>(items: TItem[], keyOf: (item: TItem) => string): Map<string, TItem[]> => {
  const groups = new Map<string, TItem[]>();

  for (const item of items) {
    const key = keyOf(item);
    const owned = groups.get(key) ?? [];

    owned.push(item);
    groups.set(key, owned);
  }

  return groups;
};

const projectOf = ([name, tasks]: [string, GraphTask[]]): Project => {
  const project: Project = { name, tasks };

  return project;
};

const bucketOf = ([folder, projects]: [string, Project[]]): Bucket => {
  const bucket: Bucket = { folder, projects };

  return bucket;
};

const projectsOf = (tasks: GraphTask[]): Project[] => {
  const byName = groupedBy(tasks, (task) => task.packageName);
  const projects = Array.from(byName, projectOf);

  return projects.sort(byProjectName);
};

const bucketsOf = (projects: Project[], facts: TaskGridFacts): Bucket[] => {
  const folderOf = (project: Project): string => facts.naming.folders.get(project.name) ?? '';
  const byFolder = groupedBy(projects, folderOf);
  const buckets = Array.from(byFolder, bucketOf);

  return buckets.sort((left, right) => byCodeUnit(left.folder, right.folder));
};

const matchingTasksOf = (project: Project, facts: TaskGridFacts, search: string): GraphTask[] => {
  const { rootLabel, naming } = facts;

  return project.tasks.filter((task) => matchesTaskSearch(task, search, rootLabel, naming.labels));
};

const isListed = (project: Project, facts: TaskGridFacts, search: string): boolean =>
  matchingTasksOf(project, facts, search).length > 0;

const idsOf = (projects: Project[]): string[] => projects.flatMap((project) => project.tasks.map((task) => task.id));

const isOpenOf = (key: string, isDefaultOpen: boolean, open: TaskGridOpen): boolean => isDefaultOpen !== open.toggled.has(key);

const taskLineOf = (task: GraphTask, facts: TaskGridFacts, depth: number): TaskLine => {
  const line: TaskLine = {
    kind: 'task',
    key: `task:${task.id}`,
    depth,
    task,
    label: chooseTaskLabelOf(task.id),
    isChecked: facts.chosen.has(task.id),
    isDrawn: facts.shown.has(task.id)
  };

  return line;
};

const projectLinesOf = (project: Project, facts: TaskGridFacts, open: TaskGridOpen, depth: number): ProjectLine[] => {
  const { name, tasks } = project;
  const key = projectKeyOf(name);
  const owner = ownerTextOf(name, facts.rootLabel, facts.naming.labels);
  const ids = idsOf([project]);
  const isOpen = isOpenOf(key, facts.rootLabel !== null, open);
  const group: GroupLine = {
    kind: 'project',
    key,
    depth,
    text: groupLabelOf(owner, tasks.length),
    label: chooseProjectLabelOf(owner),
    ids,
    state: checkStateOf(ids, facts.chosen),
    isOpen
  };

  if (!isOpen) return [group];

  const matching = matchingTasksOf(project, facts, open.search);
  const taskLines = matching.map((task) => taskLineOf(task, facts, depth + 1));

  return [group, ...taskLines];
};

const folderLinesOf = (bucket: Bucket, facts: TaskGridFacts, open: TaskGridOpen): ProjectLine[] => {
  const { folder, projects } = bucket;
  const listed = projects.filter((project) => isListed(project, facts, open.search));

  if (listed.length === 0) return [];

  const key = folderKeyOf(folder);
  const title = folderTitleOf(folder);
  const ids = idsOf(projects);
  const isOpen = isOpenOf(key, true, open);
  const group: GroupLine = {
    kind: 'folder',
    key,
    depth: 0,
    text: title,
    label: chooseFolderLabelOf(title),
    ids,
    state: checkStateOf(ids, facts.chosen),
    isOpen
  };

  if (!isOpen) return [group];

  const projectLines = listed.flatMap((project) => projectLinesOf(project, facts, open, 1));

  return [group, ...projectLines];
};

/**
 * The Projects grid, top to bottom: a folder line per folder when grouped, a project line per package with a task the
 * search matches, and a task line per matching task of an open project. The root `//` leads, the rest sort by code unit.
 */
export const taskGridLinesOf = (facts: TaskGridFacts, open: TaskGridOpen): ProjectLine[] => {
  const projects = projectsOf(facts.tasks);

  if (!facts.naming.grouped) {
    const listed = projects.filter((project) => isListed(project, facts, open.search));

    return listed.flatMap((project) => projectLinesOf(project, facts, open, 0));
  }

  const buckets = bucketsOf(projects, facts);

  return buckets.flatMap((bucket) => folderLinesOf(bucket, facts, open));
};
