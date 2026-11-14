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

/** The part of a root label that follows the prefix: its scope's rest, or the whole label with no scope or a blank rest (`@a/` + a zero-width space). */
const rootRestOf = (label: string): string => {
  const rest = restOf(label);

  if (rest === null) return label;

  const isBlank = cleanText(rest, LABEL_MAX).trim() === '';

  return isBlank ? label : rest;
};

/** The text a prefixed root reads while scopes are hidden: `(root) <rest of its label>`, or `(root)` alone for the label `root`. */
const rootTextOf = (label: string): string => {
  const text = rootRestOf(label);

  if (text === NO_NAME_ROOT_LABEL) return ROOT_LABEL_ONLY;

  return cleanText(`${ROOT_PREFIX}${text}`, LABEL_MAX);
};

/** The label of the root `//` while the repo has other packages and the root has one; `null` for any other package. */
const prefixedRootLabelOf = (pkg: PackageNode, rootPrefixed: boolean): string | null => {
  if (!rootPrefixed) return null;

  const isRoot = isRootNode(pkg);

  if (!isRoot) return null;

  return pkg.label;
};

/** The prefixed text of the root `//` while its label exists and the repo has other packages; `null` for any other package. */
export const prefixedRootTextOf = (pkg: PackageNode, rootPrefixed: boolean): string | null => {
  const label = prefixedRootLabelOf(pkg, rootPrefixed);

  if (label === null) return null;

  return rootTextOf(label);
};

/**
 * The text the graph sizes the `//` box for: `(root) ` plus the label cleaned and cut to LABEL_MAX, in both scope modes;
 * `undefined` where the root reads no prefix. The prefix sits outside the cut, so the text is never narrower than the
 * label shown with scopes shown. With scopes hidden, a label longer than about LABEL_MAX - 7 under a scope longer than
 * the prefix keeps more of its rest than this text does, so its box can grow a few pixels on Hide; accepted for names
 * that long. It is never drawn, so it may exceed LABEL_MAX.
 */
export const rootSizeNameOf = (pkg: PackageNode, rootPrefixed: boolean): string | undefined => {
  const label = prefixedRootLabelOf(pkg, rootPrefixed);

  if (label === null) return undefined;

  return `${ROOT_PREFIX}${cleanText(label, LABEL_MAX)}`;
};
