import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { packageTextOf } from '../../tree/utils/model-view.util.ts';
import type { OpenPanel } from '../common/panel.type.ts';

const TITLE_PREFIX = 'Package Details: ';

/** Whether `model`, if there is one, holds a package named `packageName`. */
export const hasPackage = (model: WorkspaceModel | null | undefined, packageName: string): boolean => {
  const isNamed = (pkg: PackageNode): boolean => pkg.name === packageName;

  return model?.packages.some(isNamed) ?? false;
};

/** The text the named package shows (its label, else its name); `null` when the model lacks it. */
export const shownLabelOf = (model: WorkspaceModel | null | undefined, packageName: string): string | null => {
  const isNamed = (pkg: PackageNode): boolean => pkg.name === packageName;
  const named = model?.packages.filter(isNamed) ?? [];
  const [text = null] = named.map(packageTextOf);

  return text;
};

/**
 * The tab title: the named package's label (else its name) cleaned, with no scope rule; when the model lacks the
 * package, `lastLabel` (the label the panel last knew), else `packageName`.
 */
export const panelTitleOf = (
  model: WorkspaceModel | null | undefined,
  packageName: string,
  lastLabel: string | null = null
): string => {
  const text = shownLabelOf(model, packageName) ?? lastLabel ?? packageName;

  return `${TITLE_PREFIX}${cleanText(text, LABEL_MAX)}`;
};

/** Brings `panel` to the front, if there is one; returns it as it came. */
export const revealed = (panel: OpenPanel | null): OpenPanel | null => {
  panel?.view.reveal();

  return panel;
};
