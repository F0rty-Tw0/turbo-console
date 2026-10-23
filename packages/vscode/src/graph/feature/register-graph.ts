import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphOpener, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_COMMAND, GRAPH_OPEN_FAILED_TEXT, SHOW_TASK_GRAPH_COMMAND } from '../common/graph.const.ts';
import { graphRootOf } from '../domain-logic/graph-root.ts';
import { showTaskGraph } from '../domain-logic/show-task-graph.ts';

/**
 * `turboConsole.openPackageGraph`: opens the graph of the resolved root, nothing when none resolves. A panel that cannot
 * be opened is logged and the user told to see Output. `turboConsole.showTaskGraph` opens it on chosen tasks
 * (`showTaskGraph`). `dispose` removes both commands and closes every panel.
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
  const showTasks = async (arg: unknown): Promise<void> => {
    await showTaskGraph(arg, { roots, ports, panels });
  };
  const command = register(GRAPH_COMMAND, openGraph);
  const taskCommand = register(SHOW_TASK_GRAPH_COMMAND, showTasks);
  const dispose = (): void => {
    command.dispose();
    taskCommand.dispose();
    panels.dispose();
  };
  const registered: Disposed = { dispose };

  return registered;
};
