import { SUPPORTED_TURBO_RANGE } from '@turbo-console/core';

import { ERROR_ICON, INFO_ICON, LOADING_ICON, WARNING_ICON } from './icon.const.ts';
import type { IconSpec, MessageKind, RowCommand } from './tree-row.type.ts';

/** Every message row opens the Output channel. */
export const SHOW_OUTPUT_COMMAND: RowCommand = { command: 'turboConsole.showOutput', args: [] };

const SUPPORTED_RANGE_TEXT = `>=${SUPPORTED_TURBO_RANGE.min} <${SUPPORTED_TURBO_RANGE.maxExclusive}`;

/**
 * Spec §4.4 texts without the spec's Markdown code marks (a tree label is plain text); `loading` is the §4.3
 * placeholder. `binary-version` embeds the range, not the found version.
 */
export const MESSAGE_TEXTS: Readonly<Record<MessageKind, string>> = {
  'binary-not-found': "turbo not found. Install the workspace's dependencies or set turboConsole.turboPath.",
  'binary-version': `This turbo version is not supported (needs ${SUPPORTED_RANGE_TEXT}). See Output.`,
  'binary-other': "Couldn't find a usable turbo. See Output.",
  'load-no-model': "Couldn't load the workspace. See Output.",
  'load-with-model': 'Showing cached data: reload failed. See Output.',
  'no-packages': 'No packages found.',
  loading: 'Loading…'
};

export const MESSAGE_ICONS: Readonly<Record<MessageKind, IconSpec>> = {
  'binary-not-found': ERROR_ICON,
  'binary-version': ERROR_ICON,
  'binary-other': ERROR_ICON,
  'load-no-model': ERROR_ICON,
  'load-with-model': WARNING_ICON,
  'no-packages': INFO_ICON,
  loading: LOADING_ICON
};
