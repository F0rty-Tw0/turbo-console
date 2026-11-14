import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

/**
 * A package's node and row text: its raw `name` while scopes are shown, its host-cleaned `bareName` while hidden; the
 * root `//` always reads its `bareName`, the host's text for its label under the scope setting. The webview cannot
 * clean text, so a name with control or zero-width characters keeps them while scopes are shown.
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

/** The sizing text of each package that has one (the host sets it on a prefixed root `//`), keyed by package name. */
export const sizeTextsOf = (infos: GraphPackage[]): ReadonlyMap<string, string> => {
  const sizeTexts = new Map<string, string>();

  for (const { name, sizeName } of infos) {
    if (sizeName !== undefined) sizeTexts.set(name, sizeName);
  }

  return sizeTexts;
};

/**
 * The box of a package drawn as `label`: the wider of the sizing text's box and the label's. The sizing text is the raw
 * name, the widest text a package draws, so its box stays put when scopes are hidden; the root `//` draws its label,
 * which is wider than `//`, and sizes for the host's `sizeName` so it never resizes on a scope toggle.
 */
export const labelledSizeOf = (name: string, label: string, sizeOf: NodeSizer): NodeSize => {
  const nameSize = sizeOf(name);
  const labelSize = sizeOf(label);

  return labelSize.width > nameSize.width ? labelSize : nameSize;
};
