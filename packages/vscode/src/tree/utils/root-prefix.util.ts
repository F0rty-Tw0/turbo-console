import type { PackageNode } from '@turbo-console/core';
import { ROOT_TASK_PACKAGE } from '@turbo-console/webview-ui';

import { restOf } from './scope-rest.util.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { NO_NAME_ROOT_LABEL, ROOT_LABEL_ONLY, ROOT_PREFIX } from '../common/root-prefix.const.ts';

const isRootNode = (pkg: PackageNode): boolean => pkg.name === ROOT_TASK_PACKAGE;

const isOtherNode = (pkg: PackageNode): boolean => pkg.name !== ROOT_TASK_PACKAGE;

/** True when the repo's full package list holds the root `//` and at least one other package. */
export const hasOtherPackagesOf = (packages: PackageNode[]): boolean => {
  const hasRoot = packages.some(isRootNode);
  const hasOther = packages.some(isOtherNode);

  return hasRoot && hasOther;
};

/** The text a prefixed root reads while scopes are hidden: `(root) <rest of its label>`, or `(root)` alone for the label `root`. */
const rootTextOf = (label: string): string => {
  const rest = restOf(label);
  const text = rest ?? label;

  if (text === NO_NAME_ROOT_LABEL) return ROOT_LABEL_ONLY;

  return cleanText(`${ROOT_PREFIX}${text}`, LABEL_MAX);
};

/** The prefixed text of the root `//` while its label exists and the repo has other packages; `null` for any other package. */
export const prefixedRootTextOf = (pkg: PackageNode, rootPrefixed: boolean): string | null => {
  if (!rootPrefixed) return null;

  const isRoot = isRootNode(pkg);

  if (!isRoot || pkg.label === null) return null;

  return rootTextOf(pkg.label);
};
