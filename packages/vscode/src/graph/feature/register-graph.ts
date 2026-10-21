import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import type { GraphOpener, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_COMMAND } from '../common/graph.const.ts';
import { graphRootOf } from '../domain-logic/graph-root.ts';

/** `turboConsole.openPackageGraph`: opens the graph of the resolved root, nothing when none resolves. `dispose` closes every panel. */
export const registerGraph = (panels: GraphOpener, roots: Roots, ports: RootPickPorts, register: CommandRegistry): Disposed => {
  const openGraph = async (): Promise<void> => {
    const root = await graphRootOf(roots, ports);

    if (root === null) return;

    panels.open(root);
  };
  const command = register(GRAPH_COMMAND, openGraph);
  const dispose = (): void => {
    command.dispose();
    panels.dispose();
  };
  const registered: Disposed = { dispose };

  return registered;
};
