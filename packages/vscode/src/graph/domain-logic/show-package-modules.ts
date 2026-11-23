import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { graphRootOf } from './graph-root.ts';
import type { PickItem } from '../../run/common/picker.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { packageTargetOf } from '../../tree/utils/package-target.util.ts';
import type { ShowTaskGraphDeps } from '../common/graph-panel.type.ts';
import { GRAPH_OPEN_FAILED_TEXT, MODULES_PICK_PLACEHOLDER } from '../common/graph.const.ts';

const itemOf = (pkg: PackageNode, root: string): PickItem => {
  const item: PickItem = { label: pkg.name, description: pkg.path, root, value: pkg.name };

  return item;
};

/** The package the palette asks about: the only one of a one-package model, else the user's pick (`undefined` when cancelled). */
const chosenPackageOf = async (model: WorkspaceModel, root: string, { ports }: ShowTaskGraphDeps): Promise<string | undefined> => {
  const [only] = model.packages;

  if (model.packages.length === 1 && only !== undefined) return only.name;

  const items = model.packages.map((pkg) => itemOf(pkg, root));

  return ports.pickOne(items, MODULES_PICK_PLACEHOLDER);
};

const openOn = (root: string, name: string | null, { panels, ports }: ShowTaskGraphDeps): void => {
  try {
    const panel = panels.open(root);

    if (name !== null) panel?.session.show({ type: 'showModules', name });
  } catch (error: unknown) {
    ports.log(logTextOf(error));
    ports.error(GRAPH_OPEN_FAILED_TEXT);
  }
};

const openFromPalette = async (deps: ShowTaskGraphDeps): Promise<void> => {
  const { roots, ports } = deps;
  const root = await graphRootOf(roots, ports);

  if (root === null) return;

  await roots.get(root)?.coordinator.ensureLoaded();

  const model = roots.get(root)?.state.model;

  if (model === null || model === undefined) {
    openOn(root, null, deps);

    return;
  }

  const name = await chosenPackageOf(model, root, deps);

  if (name !== undefined) openOn(root, name, deps);
};

/**
 * `turboConsole.showPackageModules`: a package or task row opens its root's graph on that package's modules with no question;
 * otherwise the resolved root, once loaded, asks for one of its packages (`//` included), unless it has only one. A cancelled
 * pick opens nothing, and a root with no model opens the panel alone so its error screen shows. A panel that cannot be opened
 * is logged and the user told to see Output.
 */
export const showPackageModules = async (arg: unknown, deps: ShowTaskGraphDeps): Promise<void> => {
  const target = packageTargetOf(arg);

  if (target === null) {
    await openFromPalette(deps);

    return;
  }

  openOn(target.root, target.packageName, deps);
};
