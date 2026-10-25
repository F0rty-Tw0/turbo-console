import { atomGroupsOf } from '@turbo-console/core';
import type { AtomFile, WorkspaceModel } from '@turbo-console/core';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { CommandRegistry, Disposed, TaskTarget } from '../../run/common/run.type.ts';
import { taskTargetOf } from '../../run/utils/run-target.util.ts';
import { OPEN_SPEC_COMMAND } from '../common/atom.const.ts';
import type { OpenSpecPorts } from '../common/open-spec.type.ts';
import { packageDirOf } from '../utils/package-target.util.ts';
import { openFailedSpecText, refusedSpecText, specPathOf } from '../utils/spec-path.util.ts';

/** The file task `target` names in the Atomizer groups of `model`; `undefined` when it is gone. Task ids hold the package name, so they are unique across packages. */
const fileOf = (model: WorkspaceModel, target: TaskTarget): AtomFile | undefined => {
  const files = atomGroupsOf(model).flatMap((group) => group.files);

  return files.find((file) => file.task.id === target.definition.id);
};

/** Opens the spec file of a file row, refusing a spec path that leaves its package and reporting a file the editor could not open; any other argument does nothing. */
const openSpec = async (roots: Roots, ports: OpenSpecPorts, arg: unknown): Promise<void> => {
  const target = taskTargetOf(arg);

  if (target === null) return;

  const { root } = target.definition;
  const state = roots.get(root)?.state;
  const model = state?.model;

  if (model === null || model === undefined) return;

  const file = fileOf(model, target);
  const directory = packageDirOf({ root, packageName: target.packageName }, state);

  if (file === undefined || directory === null) return;

  const path = specPathOf(directory, file.specPath);

  if (path === null) {
    ports.error(refusedSpecText(file.specPath));

    return;
  }

  try {
    await ports.open(path);
  } catch {
    ports.error(openFailedSpecText(path));
  }
};

/** Registers Open Spec, the click of an Atomizer file row; `dispose` undoes it. */
export const registerOpenSpec = (roots: Roots, ports: OpenSpecPorts, register: CommandRegistry): Disposed => {
  const open = async (arg: unknown): Promise<void> => openSpec(roots, ports, arg);
  const command = register(OPEN_SPEC_COMMAND, open);

  return command;
};
