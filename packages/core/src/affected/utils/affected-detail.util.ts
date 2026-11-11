import type { ChangedReason } from '../../shared/turbo/common/turbo.type.ts';

/** `<packageName>#<taskName>`, or `null` when turbo left either out. */
const dependencyTaskOf = (reason: ChangedReason): string | null => {
  const packageName = reason.packageName ?? null;
  const taskName = reason.taskName ?? null;

  if (packageName === null || taskName === null) return null;

  return `${packageName}#${taskName}`;
};

/**
 * What changed behind a reason, per its kind: the file path of `TaskFileChanged`, `TaskGlobalFileChanged` and
 * `TaskGlobalDepsChanged`; `<package>#<task>` of `TaskDependencyTaskChanged`; the package of `TaskPackageDependencyChanged`;
 * the description of `TaskAllChanged` (an empty one stays `''`). `null` for a kind turbo adds later, or a field it left out.
 */
export const affectedDetailOf = (reason: ChangedReason): string | null => {
  // eslint-disable-next-line no-underscore-dangle -- GraphQL's own __typename key, copied from turbo's output.
  switch (reason.__typename) {
    case 'TaskFileChanged':
    case 'TaskGlobalFileChanged':
    case 'TaskGlobalDepsChanged':
      return reason.filePath ?? null;
    case 'TaskDependencyTaskChanged':
      return dependencyTaskOf(reason);
    case 'TaskPackageDependencyChanged':
      return reason.packageName ?? null;
    case 'TaskAllChanged':
      return reason.description ?? null;
    default:
      return null;
  }
};
