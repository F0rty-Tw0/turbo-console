import { join } from 'node:path';

import { MAX_KEYED_FILE_BYTES } from '../../cache/common/cache.const.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { errnoCode, isMissing } from '../../shared/errors/utils/errno.util.ts';
import { ioMessage } from '../../shared/errors/utils/turbo-message.util.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import { untilAborted } from '../../shared/turbo/data-access/until-aborted.ts';

const INLINE_LIST = /^\[(.*)\]$/;

const TRAILING_COMMENT = /\s+#.*$/;

const BYTE_ORDER_MARK = /^\uFEFF/;

/** A filesystem error naming `absolute`, as `io`. */
const ioError = (absolute: string, error: unknown): TurboException =>
  new TurboException('io', ioMessage(absolute, errnoCode(error)), { cause: error });

const isSignificant = (line: string): boolean => {
  const text = line.trim();

  return text !== '' && !text.startsWith('#');
};

const isItem = (line: string): boolean => {
  const text = line.trim();

  return text === '-' || text.startsWith('- ');
};

/**
 * An inline `[ … ]` list with something inside. A `[` left open on the key line is a flow list over several lines, read
 * as declaring (the monorepo side, as before single-package support). `|`, `>`, an anchor and any other inline form are
 * not read.
 */
const hasInlineItems = (inline: string): boolean => {
  const isClosed = inline.includes(']');

  if (!isClosed) return inline.startsWith('[');

  const inner = INLINE_LIST.exec(inline)?.[1] ?? '';

  return inner.trim() !== '';
};

const indentOf = (line: string): number => line.length - line.trimStart().length;

/**
 * Whether a top-level `packages` key holds an item: an inline list, or a `-` line next. Top level is the indent of the
 * first significant line (YAML allows an indented root mapping). Line scan, no YAML parser.
 */
const declaresPackages = (text: string): boolean => {
  const lines = text.replace(BYTE_ORDER_MARK, '').split(/\r?\n/).filter(isSignificant);
  const rootIndent = indentOf(lines[0] ?? '');
  const isRootKey = (line: string): boolean => indentOf(line) === rootIndent && line.trimStart().startsWith('packages:');
  const keyIndex = lines.findIndex(isRootKey);
  const keyLine = lines[keyIndex]?.trimStart() ?? '';
  const inline = keyLine.slice('packages:'.length).replace(TRAILING_COMMENT, '').trim();
  const next = lines[keyIndex + 1] ?? '';

  if (keyIndex === -1) return false;

  if (inline !== '') return hasInlineItems(inline);

  return isItem(next);
};

/**
 * Whether the root `pnpm-workspace.yaml` lists at least one `packages` entry. A missing file, one that is no regular
 * file or one over `MAX_KEYED_FILE_BYTES` is `false`; any other read failure rejects `io`. The catch sits inside the
 * read so an abort, which `untilAborted` throws as a raw `AbortError`, reaches the caller unchanged.
 */
export const hasPnpmWorkspacePackages = async (root: string, signal?: AbortSignal): Promise<boolean> => {
  const absolute = join(root, 'pnpm-workspace.yaml');
  const read = async (): Promise<boolean> => {
    try {
      const text = await readSmallFile(absolute, MAX_KEYED_FILE_BYTES);

      return text !== null && declaresPackages(text);
    } catch (error) {
      const isAbsent = isMissing(error);

      if (isAbsent) return false;

      throw ioError(absolute, error);
    }
  };

  return untilAborted(read, signal);
};
