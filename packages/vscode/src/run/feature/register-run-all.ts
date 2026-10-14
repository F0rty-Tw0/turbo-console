import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { RunAllEventSource, RunAllPorts, RunAllRequest } from '../common/run-all.type.ts';
import type { CommandRegistry, Disposed } from '../common/run.type.ts';
import { RunAllGuard, runAll } from '../domain-logic/run-all.ts';

const EVERYWHERE: RunAllRequest = { affected: false };

const AFFECTED: RunAllRequest = { affected: true };

/**
 * Spec §4.6.5 entry points: Run Task in All Packages… and Run Affected…, and the events of their tasks, which keep the
 * guard: a process start proves the launch, a task end frees the key. `dispose` undoes all of it.
 */
export const registerRunAll = (roots: Roots, ports: RunAllPorts, events: RunAllEventSource, register: CommandRegistry): Disposed => {
  const guard = new RunAllGuard();
  const runEverywhere = async (): Promise<void> => runAll(roots, guard, ports, EVERYWHERE);
  const runAffected = async (): Promise<void> => runAll(roots, guard, ports, AFFECTED);
  const commands = [register('turboConsole.runEverywhere', runEverywhere), register('turboConsole.runAffected', runAffected)];
  const subscription = events({
    processStarted: (definition) => {
      guard.markStarted(definition);
    },
    taskEnded: (definition) => {
      guard.releaseOn(definition);
    }
  });
  const dispose = (): void => {
    for (const command of commands) command.dispose();

    subscription.dispose();
  };
  const registered: Disposed = { dispose };

  return registered;
};
