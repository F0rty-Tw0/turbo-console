import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { TaskOffer } from '../../run/common/picker.type.ts';
import { packageForManifest, relativePathOf } from '../../run/utils/package-lookup.util.ts';
import { taskItemsOf } from '../../run/utils/picker-items.util.ts';
import { jsonPropertyAt } from '../../shared/utils/json-property.util.ts';
import { lineAt } from '../../shared/utils/text-line.util.ts';
import { LENS_NAMES_MAX, LENS_TEXT_MAX } from '../common/codelens.const.ts';
import type { LensSpec } from '../common/codelens.type.ts';

/** The line of the top-level `"scripts"` key, 0 without one. A text over `LENS_TEXT_MAX` is not parsed and gives 0. */
const scriptsLineOf = (text: string): number => {
  const isTooLarge = text.length > LENS_TEXT_MAX;

  if (isTooLarge) return 0;

  const property = jsonPropertyAt(text, ['scripts']);
  const key = property?.children?.[0];

  if (key === undefined) return 0;

  return lineAt(text, key.offset);
};

const titleOf = (labels: string[]): string => {
  const shown = labels.slice(0, LENS_NAMES_MAX).join(', ');
  const more = labels.length > LENS_NAMES_MAX ? ', …' : '';

  return `▷ Tasks: ${shown}${more} (${labels.length})`;
};

/**
 * Spec 1c-b §4.11: the lens of the `package.json` at `file`, or `null` when there is nothing to act on: no state, no
 * model, a binary error, no package owning the file (the root manifest of a monorepo: its model holds no `//`, V5) or no
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
