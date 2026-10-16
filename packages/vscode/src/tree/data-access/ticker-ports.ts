import type { TickerPorts } from '../common/ticker.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';

/** The elapsed ticker's real ports: `every` on `setInterval`, `fire` redrawing one task row of `tree`. */
export const tickerPortsOf = (tree: Pick<PackagesTreeApi, 'refreshTask'>): TickerPorts => {
  const every: TickerPorts['every'] = (ms, tick) => {
    const interval = setInterval(tick, ms);

    return (): void => {
      clearInterval(interval);
    };
  };
  const fire: TickerPorts['fire'] = (root, taskId) => {
    tree.refreshTask(root, taskId);
  };
  const ports: TickerPorts = { every, fire };

  return ports;
};
