import type { PackageNode } from '@turbo-console/core';

import { runNamed } from './pick-and-run.ts';
import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { binaryMessageOf } from '../../tree/utils/root-rows.util.ts';
import { NOT_PACKAGE_TEXT, TASK_PLACEHOLDER } from '../common/picker.const.ts';
import type { FileLookupPorts, FilePackage, FileTasks, NamedTask, PickerPorts, TaskOffer } from '../common/picker.type.ts';
import { packageForManifest, relativePathOf } from '../utils/package-lookup.util.ts';
import { taskItemsOf } from '../utils/picker-items.util.ts';
import { emptyTasksText } from '../utils/picker-text.util.ts';

const refused = (ports: FileLookupPorts, text: string): null => {
  ports.info(text);

  return null;
};

type ManifestInRoot = {
  readonly root: string;
  readonly file: string;
};

/**
 * What to say when a root shows no model: the load error's text when its load failed, the binary text when the binary
 * failed (the run pickers refuse earlier), else that the file is no package.
 */
const noModelText = (error: RootState['error'] | undefined): string => {
  if (error?.stage === 'load') return MESSAGE_TEXTS['load-no-model'];

  if (error?.stage === 'binary') return MESSAGE_TEXTS[binaryMessageOf(error.error.kind)];

  return NOT_PACKAGE_TEXT;
};

/**
 * The package `file` holds in `root` once the root has loaded, or the text that says why there is none. A binary-stage
 * error is a reason only when `isBinaryRefused`: a root that kept its model can still show the package.
 */
const packageOrText = async (
  roots: Roots,
  ports: FileLookupPorts,
  manifest: ManifestInRoot,
  isBinaryRefused: boolean
): Promise<PackageNode | string> => {
  const { root, file } = manifest;

  await ports.ensureLoaded(root);

  const state = roots.get(root)?.state;
  const error = state?.error;

  if (error?.stage === 'binary' && isBinaryRefused) return MESSAGE_TEXTS[binaryMessageOf(error.error.kind)];

  const model = state?.model;

  if (model === null || model === undefined) return noModelText(error);

  const relative = relativePathOf(root, file);

  return packageForManifest(relative, model) ?? NOT_PACKAGE_TEXT;
};

/**
 * The package the manifest `file` holds and the root holding it, once the root has loaded; `null` after an info message
 * says why there is none (no file, a file in no root, a root with no model or, when `isBinaryRefused`, in a binary
 * error, a file no package owns). The run pickers and Open Package Details both refuse here; only the pickers refuse a
 * binary error. The message goes through `ports.info`, which may show nothing (see `FileLookupPorts`).
 */
export const packageOfFile = async (
  roots: Roots,
  ports: FileLookupPorts,
  file: string | null,
  isBinaryRefused: boolean
): Promise<FilePackage | null> => {
  if (file === null) return refused(ports, NOT_PACKAGE_TEXT);

  const root = ports.rootOf(file);

  if (root === null) return refused(ports, NOT_PACKAGE_TEXT);

  const entry = roots.get(root);

  if (entry === undefined) return refused(ports, NOT_PACKAGE_TEXT);

  const pkg = await packageOrText(roots, ports, { root, file }, isBinaryRefused);

  if (typeof pkg === 'string') return refused(ports, pkg);

  const found: FilePackage = { root, pkg };

  return found;
};

/**
 * The tasks to offer for the package `found`: turbo tasks, then scripts while they are shown. `null` after an info message
 * says why there are none: that the package has no task, or (scripts hidden) how many offered scripts it holds.
 */
const tasksOfPackage = (roots: Roots, ports: PickerPorts, found: FilePackage): FileTasks | null => {
  const { root, pkg } = found;
  const packageManager = roots.get(root)?.state.model?.packageManager.name;

  if (packageManager === undefined) return refused(ports, NOT_PACKAGE_TEXT);

  const scriptsShown = ports.scriptsShown();
  const offer: TaskOffer = { scriptsShown, packageManager };
  const items = taskItemsOf(root, pkg, offer);

  if (items.length === 0) return refused(ports, emptyTasksText(pkg, scriptsShown));

  const placeholder = `${TASK_PLACEHOLDER} in ${cleanText(pkg.name, LABEL_MAX)}`;
  const tasks: FileTasks = { packageName: pkg.name, placeholder, items };

  return tasks;
};

const pickTaskAndRun = async (roots: Roots, ports: PickerPorts, found: FilePackage): Promise<void> => {
  const tasks = tasksOfPackage(roots, ports, found);

  if (tasks === null) return;

  const task = await ports.pick(tasks.items, tasks.placeholder);

  if (task === undefined) return;

  const target: NamedTask = { root: task.root, packageName: tasks.packageName, taskName: task.value };

  await runNamed(roots, ports, target);
};

/**
 * Spec §4.6.4: finds the root holding `file` (the active editor's file, if any), loads it, matches the file's directory
 * to a package, picks one of its offered tasks and runs it. The root manifest, a file in no root or in no package, and a
 * root in a binary error end in an info message.
 */
export const pickForFileAndRun = async (roots: Roots, ports: PickerPorts, file: string | null): Promise<void> => {
  const found = await packageOfFile(roots, ports, file, true);

  if (found === null) return;

  await pickTaskAndRun(roots, ports, found);
};
