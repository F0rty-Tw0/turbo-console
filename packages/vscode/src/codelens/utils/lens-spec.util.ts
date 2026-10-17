import { findNodeAtLocation, parseTree } from 'jsonc-parser';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { TaskOffer } from '../../run/common/picker.type.ts';
import { packageForManifest, relativePathOf } from '../../run/utils/package-lookup.util.ts';
import { taskItemsOf } from '../../run/utils/picker-items.util.ts';
import { LENS_NAMES_MAX, LENS_TEXT_MAX } from '../common/codelens.const.ts';
import type { LensSpec } from '../common/codelens.type.ts';

/** The editor counts CR LF, a lone CR and a lone LF as one line break each. */
const LINE_BREAK = /\r\n|[\r\n]/g;

const lineAt = (text: string, offset: number): number => {
  const breaks = text.slice(0, offset).match(LINE_BREAK);

  return breaks?.length ?? 0;
};

/**
 * `findNodeAtLocation` returns the key's value, so the key is the first child of that value's property node. A parse
 * error still leaves a tree.
 */
const parsedScriptsLineOf = (text: string): number => {
  const tree = parseTree(text);

  if (tree === undefined) return 0;

  const value = findNodeAtLocation(tree, ['scripts']);
  const key = value?.parent?.children?.[0];

  if (key === undefined) return 0;

  return lineAt(text, key.offset);
};

/**
 * The line of the top-level `"scripts"` key, 0 without one. A text over `LENS_TEXT_MAX` is not parsed and gives 0. The
 * parser recurses once per nesting level, so a text nested deep enough to overflow the stack gives 0 instead of throwing.
 */
const scriptsLineOf = (text: string): number => {
  const isTooLarge = text.length > LENS_TEXT_MAX;

  if (isTooLarge) return 0;

  try {
    return parsedScriptsLineOf(text);
  } catch (error) {
    if (error instanceof RangeError) return 0;

    throw error;
  }
};

const titleOf = (labels: string[]): string => {
  const shown = labels.slice(0, LENS_NAMES_MAX).join(', ');
  const more = labels.length > LENS_NAMES_MAX ? ', …' : '';

  return `▷ Tasks: ${shown}${more} (${labels.length})`;
};

/**
 * Spec 1c-b §4.11: the lens of the `package.json` at `file`, or `null` when there is nothing to act on: no state, no
 * model, a binary error, no package owning the file (the root manifest included: the model holds no `//`, V5) or no
 * offered task. Reads only the loaded state and `text`; the names are the picker's labels, in picker order and
 * `$(`-escaped.
 */
export const lensSpecOf = (text: string, file: string, state: RootState | undefined, scriptsShown: boolean): LensSpec | null => {
  if (state === undefined) return null;

  const { model, folder } = state;
  const isBinaryError = state.error?.stage === 'binary';

  if (model === null || isBinaryError) return null;

  const relative = relativePathOf(folder.root, file);
  const pkg = packageForManifest(relative, model);

  if (pkg === null) return null;

  const offer: TaskOffer = { scriptsShown, packageManager: model.packageManager.name };
  const items = taskItemsOf(folder.root, pkg, offer);

  if (items.length === 0) return null;

  const labels = items.map((item) => item.label);
  const spec: LensSpec = { line: scriptsLineOf(text), title: titleOf(labels) };

  return spec;
};
