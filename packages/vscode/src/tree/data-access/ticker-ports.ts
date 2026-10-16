import type { TickerPorts } from '../common/ticker.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';

/** The elapsed ticker's real ports: `every` on `setInterval`, `fire` redrawing the running task rows of `tree` at once. */
export const tickerPortsOf = (tree: Pick<PackagesTreeApi, 'refreshTasks'>): TickerPorts => {
  const every: TickerPorts['every'] = (ms, tick) => {
    const interval = setInterval(tick, ms);

    return (): void => {
      clearInterval(interval);
    };
  };
  const fire: TickerPorts['fire'] = (running) => {
    tree.refreshTasks(running);
  };
  const ports: TickerPorts = { every, fire };

  return ports;
};
