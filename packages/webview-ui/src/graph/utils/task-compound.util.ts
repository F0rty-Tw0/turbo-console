import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { folderIdOf } from './folder-id.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import {
  ROOT_TASK_PACKAGE,
  SCRIPTS_BOX_PREFIX,
  TASK_BOX_PREFIX,
  TITLED_ROW_PADDING,
  TITLE_SLOT_PREFIX,
  TITLE_TIE_PREFIX
} from '../common/graph-task.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { FOLDER_PADDING_PX, NODE_FONT_SIZE } from '../common/graph.const.ts';
import type { ElkOptions } from '../common/layout.type.ts';

/** The compound id of a task's package; the root package `//` gives `pkg://`. */
export const taskBoxIdOf = (packageName: string): string => `${TASK_BOX_PREFIX}${packageName}`;

/** The id of the compound that holds a package's script tasks inside its package box; the root `//` gives `scripts://`. */
export const scriptsBoxIdOf = (packageName: string): string => `${SCRIPTS_BOX_PREFIX}${packageName}`;

/** The compound a task is drawn in: its package box for a turbo task, the package's Scripts box for a script. */
export const parentIdOf = (task: GraphTask): string => {
  const { packageName, isTurboTask } = task;
  const packageBox = taskBoxIdOf(packageName);
  const scriptsBox = scriptsBoxIdOf(packageName);
  const parent = isTurboTask ? packageBox : scriptsBox;

  return parent;
};

/**
 * The folder of a package's path; the root `//` is always in the root folder `''`, even where the folders map holds it, and
 * so is a package the folders map lacks.
 */
export const taskFolderOf = (packageName: string, naming: TaskNaming): string => {
  if (packageName === ROOT_TASK_PACKAGE) return '';

  const folder = naming.folders.get(packageName) ?? '';

  return folder;
};

const packageNameOf = (task: GraphTask): string => task.packageName;

const isScript = (task: GraphTask): boolean => !task.isTurboTask;

/** The packages of `tasks`, once each in first-seen order. */
export const taskPackagesOf = (tasks: GraphTask[]): Set<string> => new Set(tasks.map(packageNameOf));

/** The packages with a script task among `tasks`, once each in first-seen order. */
export const scriptPackagesOf = (tasks: GraphTask[]): Set<string> => {
  const scripts = tasks.filter(isScript);

  return taskPackagesOf(scripts);
};

/** While grouped, each folder holding one of `packageNames`, once each in first-seen order; none while ungrouped. */
export const taskFoldersOf = (packageNames: Iterable<string>, naming: TaskNaming): string[] => {
  if (!naming.grouped) return [];

  const folderOfName = (packageName: string): string => taskFolderOf(packageName, naming);
  const names = [...packageNames];
  const folders = new Set(names.map(folderOfName));

  return [...folders];
};

/**
 * The id of the folder box a package box sits in while grouped, `null` while ungrouped; the root `//` sits in the root
 * folder's box, beside the packages of the repo root.
 */
export const folderBoxIdOf = (packageName: string, naming: TaskNaming): string | null => {
  if (!naming.grouped) return null;

  const folder = taskFolderOf(packageName, naming);

  return folderIdOf(folder);
};

/**
 * A task compound's options on top of `base` (the view's padded options): with a title width, at least that wide plus both
 * paddings, so its title draws whole. Under `elk.direction: DOWN` ELK reads the minimum as (height, width); the 0 height is
 * no minimum.
 */
export const compoundOptionsOf = (titleWidth: number | undefined, base: ElkOptions): ElkOptions => {
  if (titleWidth === undefined) return base;

  const minimum = `(0, ${titleWidth + 2 * FOLDER_PADDING_PX})`;
  const options = { ...base, 'elk.nodeSize.constraints': 'MINIMUM_SIZE', 'elk.nodeSize.minimum': minimum };

  return options;
};

/** The id of the placeholder leaf that holds a titled-row box's title; the root `//` gives `title-slot://`. */
export const titleSlotIdOf = (packageName: string): string => `${TITLE_SLOT_PREFIX}${packageName}`;

/** The id of the edge that ties a titled-row box's placeholder to its task. */
export const titleTieIdOf = (packageName: string): string => `${TITLE_TIE_PREFIX}${packageName}`;

export const isTitleSlotId = (id: string): boolean => id.startsWith(TITLE_SLOT_PREFIX);

export const isTitleTieId = (id: string): boolean => id.startsWith(TITLE_TIE_PREFIX);

/** A titled-row box: a package box with a title width, exactly one turbo leaf (an umbrella counts) and no Scripts box. */
export const isTitledRow = (
  titleWidth: number | undefined,
  turboLeaves: readonly unknown[],
  scriptsBoxes: readonly unknown[]
): boolean => titleWidth !== undefined && turboLeaves.length === 1 && scriptsBoxes.length === 0;

/**
 * A titled-row box: a title placeholder leaf above its one `leaf`, tied to it by an edge in the box's own `edges` (not the
 * root's, so packing never joins components), so ELK keeps links off the title; its padding is thin at the top.
 */
export const titledRowOf = (packageName: string, leaf: ElkNode, titleWidth: number, layoutOptions: ElkOptions): ElkNode => {
  const slot: ElkNode = { id: titleSlotIdOf(packageName), width: titleWidth, height: NODE_FONT_SIZE };
  const tie = { id: titleTieIdOf(packageName), sources: [slot.id], targets: [leaf.id] };
  const options = { ...layoutOptions, 'elk.padding': TITLED_ROW_PADDING };
  const box: ElkNode = { id: taskBoxIdOf(packageName), layoutOptions: options, children: [slot, leaf], edges: [tie] };

  return box;
};
