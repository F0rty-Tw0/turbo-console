import { turboOptionArgs } from '@turbo-console/core';
import type { RunTaskOptions } from '@turbo-console/core';

import type { RunEntry } from '../../run/common/run.type.ts';

const turboOptionsLineOf = (entry: RunEntry): string | null => {
  const options: RunTaskOptions = { ...entry.extras, force: false };
  const chosen = turboOptionArgs(options);

  if (chosen.length === 0) return null;

  const forced: RunTaskOptions = { ...entry.extras, force: entry.force };
  const words = turboOptionArgs(forced);

  return `Options: ${words.join(' ')}`;
};

const scriptArgsLineOf = (entry: RunEntry): string | null => {
  const args = entry.extras?.passThrough ?? [];

  if (args.length === 0) return null;

  return `Arguments: ${args.join(' ')}`;
};

/** The tooltip line for what the user chose in Run with Options: `Options:` (turbo) or `Arguments:` (script). */
export const runOptionsLineOf = (entry: RunEntry): string | null => {
  if (entry.task.isTurboTask) return turboOptionsLineOf(entry);

  return scriptArgsLineOf(entry);
};
