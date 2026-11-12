import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';

/**
 * A package's node and row text: its raw `name` while scopes are shown, its host-cleaned `bareName` while hidden; the
 * root `//` always reads its `bareName`, the host's text for its label. The webview cannot clean text, so a name with
 * control or zero-width characters keeps them while scopes are shown.
 */
export const packageLabelOf = (pkg: GraphPackage, scopeShown: boolean): string => {
  const isRaw = scopeShown && pkg.name !== ROOT_TASK_PACKAGE;

  return isRaw ? pkg.name : pkg.bareName;
};

/** One label per package, keyed by package name; it holds the root `//` only when the host listed it as a package. */
export const labelsOf = (infos: GraphPackage[], scopeShown: boolean): ReadonlyMap<string, string> => {
  const entryOf = (pkg: GraphPackage): [string, string] => [pkg.name, packageLabelOf(pkg, scopeShown)];
  const labels = new Map(infos.map(entryOf));

  return labels;
};

/** The label `labels` gives the package `name`; a name it lacks reads as itself. */
export const labelIn = (labels: ReadonlyMap<string, string>, name: string): string => labels.get(name) ?? name;
