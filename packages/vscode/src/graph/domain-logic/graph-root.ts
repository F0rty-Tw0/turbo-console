import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { RootPickPorts } from '../common/graph-panel.type.ts';
import { NO_ROOT_TEXT } from '../common/graph.const.ts';

/** The root holding the active file, when the store has it. */
const activeRootOf = (roots: Roots, ports: RootPickPorts): string | null => {
  const file = ports.activeFile();

  if (file === null) return null;

  const root = ports.rootOf(file);

  if (root === null) return null;

  const entry = roots.get(root);

  return entry === undefined ? null : root;
};

/**
 * The root the graph opens for: the active file's root when the store has it, else the only root, else the user's pick
 * (`null` when cancelled); with no roots the user is told and the result is `null`.
 */
export const graphRootOf = async (roots: Roots, ports: RootPickPorts): Promise<string | null> => {
  const fileRoot = activeRootOf(roots, ports);

  if (fileRoot !== null) return fileRoot;

  const folders = roots.all().map((entry) => entry.state.folder);
  const [first] = folders;

  if (first === undefined) {
    ports.info(NO_ROOT_TEXT);

    return null;
  }

  if (folders.length === 1) return first.root;

  const picked = await ports.pick(folders);

  return picked ?? null;
};
