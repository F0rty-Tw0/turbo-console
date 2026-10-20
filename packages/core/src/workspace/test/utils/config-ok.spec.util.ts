import type { TaskPresence, TurboConfigOk } from '../../common/turbo-config.type.ts';

/** A parsed root `turbo.json` with these task `tasks` presences and `persistent` values, and nothing else set. */
export const configOf = (tasks: Record<string, TaskPresence>, persistent: Record<string, boolean> = {}): TurboConfigOk => {
  const config: TurboConfigOk = {
    path: 'turbo.json',
    descriptions: {},
    tasks,
    persistent,
    extends: [],
    affectedUsingTaskInputs: false
  };

  return config;
};
