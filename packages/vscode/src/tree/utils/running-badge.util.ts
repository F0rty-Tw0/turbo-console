import type { ViewBadge } from 'vscode';

/** UB5a §3.4: the Packages view badge for `count` running runs; none while nothing runs. */
export const runningBadgeOf = (count: number): ViewBadge | undefined => {
  if (count === 0) return undefined;

  const badge: ViewBadge = { value: count, tooltip: `${count} running` };

  return badge;
};
