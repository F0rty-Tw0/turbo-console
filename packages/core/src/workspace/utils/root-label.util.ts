import { basename } from 'node:path';

import { ROOT_NAME } from './turbo-task-lookup.util.ts';
import { plainLine } from '../../shared/errors/utils/plain-text.util.ts';

/** npm's package name limit: a longer `name` is cut, so a hostile one never makes a long row. */
const MAX_NAME_LENGTH = 214;

/** `name` cut, made well-formed and one plain line, trimmed; `''` when nothing printable is left. */
const cleanName = (name: string): string => plainLine(name.slice(0, MAX_NAME_LENGTH).toWellFormed()).trim();

const cleanedLabelOf = (name: unknown): string => {
  if (typeof name !== 'string') return '';

  return cleanName(name);
};

/**
 * The display label of a single-package root: its `package.json` `name` when that is a string with printable text left
 * after `cleanName`, else the folder name of `root`, else `//`. `name` is as parsed and unchecked.
 */
export const rootLabelOf = (name: unknown, root: string): string => {
  const cleaned = cleanedLabelOf(name);

  if (cleaned !== '') return cleaned;

  const folder = basename(root);

  if (folder !== '') return folder;

  return ROOT_NAME;
};
