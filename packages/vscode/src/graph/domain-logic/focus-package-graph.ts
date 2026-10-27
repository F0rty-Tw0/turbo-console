import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { packageTargetOf } from '../../tree/utils/package-target.util.ts';
import type { GraphOpener, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_OPEN_FAILED_TEXT } from '../common/graph.const.ts';

type FocusPackageGraphDeps = {
  readonly panels: Pick<GraphOpener, 'open'>;
  readonly ports: Pick<RootPickPorts, 'log' | 'error'>;
};

/**
 * `turboConsole.focusPackageInGraph`: a package or task row opens the graph of its root and asks it to show that package;
 * any other argument does nothing. A panel that cannot be opened is logged and the user told to see Output.
 */
export const focusPackageInGraph = (arg: unknown, { panels, ports }: FocusPackageGraphDeps): void => {
  const target = packageTargetOf(arg);

  if (target === null) return;

  try {
    const panel = panels.open(target.root);

    panel?.session.show({ type: 'showPackage', name: target.packageName });
  } catch (error: unknown) {
    ports.log(logTextOf(error));
    ports.error(GRAPH_OPEN_FAILED_TEXT);
  }
};
