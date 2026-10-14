import type { PackageNode } from '@turbo-console/core';

import { runNamed } from './pick-and-run.ts';
import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { binaryMessageOf } from '../../tree/utils/root-rows.util.ts';
import { NOT_PACKAGE_TEXT, NO_TASKS_TEXT, TASK_PLACEHOLDER } from '../common/picker.const.ts';
import type { FileTasks, NamedTask, PickerPorts } from '../common/picker.type.ts';
import { packageForManifest, relativePathOf } from '../utils/package-lookup.util.ts';
import { taskItemsOf } from '../utils/picker-items.util.ts';

const refused = (ports: PickerPorts, text: string): null => {
  ports.info(text);

  return null;
};

/** What to say when a root shows no model: the load error's text when its load failed, else that the file is no package. */
const noModelText = (error: RootState['error'] | undefined): string => {
  if (error?.stage === 'load') return MESSAGE_TEXTS['load-no-model'];

  return NOT_PACKAGE_TEXT;
};

/** The package `file` holds in `root` once the root has loaded, or the text that says why there is none. */
const packageOrText = async (roots: Roots, ports: PickerPorts, root: string, file: string): Promise<PackageNode | string> => {
  await ports.ensureLoaded(root);

  const state = roots.get(root)?.state;
  const error = state?.error;

  if (error?.stage === 'binary') return MESSAGE_TEXTS[binaryMessageOf(error.error.kind)];

  const model = state?.model;

  if (model === null || model === undefined) return noModelText(error);

  const relative = relativePathOf(root, file);

  return packageForManifest(relative, model) ?? NOT_PACKAGE_TEXT;
};

/** The tasks to offer for the manifest `file`; `null` after an info message says why there are none. */
const tasksOfFile = async (roots: Roots, ports: PickerPorts, file: string | null): Promise<FileTasks | null> => {
  if (file === null) return refused(ports, NOT_PACKAGE_TEXT);

  const root = ports.rootOf(file);

  if (root === null) return refused(ports, NOT_PACKAGE_TEXT);

  const entry = roots.get(root);

  if (entry === undefined) return refused(ports, NOT_PACKAGE_TEXT);

  const pkg = await packageOrText(roots, ports, root, file);

  if (typeof pkg === 'string') return refused(ports, pkg);

  const items = taskItemsOf(root, pkg);

  if (items.length === 0) return refused(ports, NO_TASKS_TEXT);

  const placeholder = `${TASK_PLACEHOLDER} in ${cleanText(pkg.name, LABEL_MAX)}`;
  const found: FileTasks = { packageName: pkg.name, placeholder, items };

  return found;
};

/**
 * Spec §4.6.4: finds the root holding `file` (the active editor's file, if any), loads it, matches the file's directory
 * to a package, picks one of its visible tasks and runs it. The root manifest, a file in no root or in no package, and a
 * root in a binary error end in an info message.
 */
export const pickForFileAndRun = async (roots: Roots, ports: PickerPorts, file: string | null): Promise<void> => {
  const found = await tasksOfFile(roots, ports, file);

  if (found === null) return;

  const task = await ports.pick(found.items, found.placeholder);

  if (task === undefined) return;

  const target: NamedTask = { root: task.root, packageName: found.packageName, taskName: task.value };

  await runNamed(roots, ports, target);
};
