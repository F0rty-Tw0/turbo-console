import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { RunOptionsPorts } from '../common/run-options.type.ts';
import type { CommandRegistry, Disposed } from '../common/run.type.ts';
import { runWithOptions } from '../domain-logic/run-with-options.ts';

/** Run with Options on a task row; the palette hides it and a non-task argument does nothing. */
export const registerRunOptions = (roots: Roots, ports: RunOptionsPorts, register: CommandRegistry): Disposed => {
  const registered = register('turboConsole.runTaskWithOptions', async (arg) => runWithOptions(roots, ports, arg));

  return registered;
};
