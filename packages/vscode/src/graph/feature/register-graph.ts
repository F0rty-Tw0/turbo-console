import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphOpener, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_COMMAND, GRAPH_OPEN_FAILED_TEXT } from '../common/graph.const.ts';
import { graphRootOf } from '../domain-logic/graph-root.ts';

/**
 * `turboConsole.openPackageGraph`: opens the graph of the resolved root, nothing when none resolves. A panel that cannot
 * be opened is logged and the user told to see Output. `dispose` closes every panel.
 */
export const registerGraph = (panels: GraphOpener, roots: Roots, ports: RootPickPorts, register: CommandRegistry): Disposed => {
  const openGraph = async (): Promise<void> => {
    const root = await graphRootOf(roots, ports);

    if (root === null) return;

    try {
      panels.open(root);
    } catch (error: unknown) {
      ports.log(logTextOf(error));
      ports.error(GRAPH_OPEN_FAILED_TEXT);
    }
  };
  const command = register(GRAPH_COMMAND, openGraph);
  const dispose = (): void => {
    command.dispose();
    panels.dispose();
  };
  const registered: Disposed = { dispose };

  return registered;
};
