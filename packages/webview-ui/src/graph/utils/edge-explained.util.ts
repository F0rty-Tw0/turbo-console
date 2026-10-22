import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import {
  ENTRY_TEXT_MAX,
  MANIFEST_ENTRIES_MAX,
  MANIFEST_FIELDS,
  MANIFEST_FILE_MAX,
  MANIFEST_LINE_MAX
} from '../../bridge/common/graph-message.const.ts';
import type { ManifestField } from '../../bridge/common/graph-message.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';

const isString = (value: unknown): value is string => typeof value === 'string';

const isManifestField = (value: unknown): value is ManifestField => MANIFEST_FIELDS.some((field) => field === value);

const isShortString = (value: unknown, max: number): boolean => isString(value) && value.length <= max;

const isSide = (side: unknown): boolean => side === undefined || isShortString(side, ENTRY_TEXT_MAX + 1);

const isContext = (value: unknown, line: number): boolean => {
  if (!isRecord(value)) return false;

  const { before, after } = value;
  const isBeforeAllowed = before === undefined || line >= 1;

  return isBeforeAllowed && isSide(before) && isSide(after);
};

const isEntry = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { field, key, spec, line, context } = value;

  if (typeof line !== 'number') return false;

  const isField = isManifestField(field);
  const isKey = isShortString(key, ENTRY_TEXT_MAX + 1);
  const isSpec = isShortString(spec, ENTRY_TEXT_MAX + 1);
  const isWhole = Number.isInteger(line);
  const isLine = isWhole && line >= 0 && line <= MANIFEST_LINE_MAX;
  const isEntryShape = isField && isKey && isSpec;

  if (!isEntryShape || !isLine) return false;

  return isContext(context, line);
};

const isEntries = (entries: unknown): boolean => {
  if (!Array.isArray(entries)) return false;

  const isCounted = entries.length >= 1 && entries.length <= MANIFEST_ENTRIES_MAX;

  return isCounted && entries.every(isEntry);
};

const isResult = (result: unknown): boolean => {
  if (!isRecord(result)) return false;

  const { kind, file, entries } = result;

  const isFile = isShortString(file, MANIFEST_FILE_MAX);

  if (!isFile) return false;

  if (kind === 'found') return isEntries(entries);

  return kind === 'missing' || kind === 'unreadable';
};

/** Whether the whole `edgeExplained` record has its two package names and a result the page can show; entry text may be up to one character past the host's cut (the `…`). */
export const isEdgeExplained = (value: UnknownRecord): boolean => {
  const { source, target, result } = value;

  return isString(source) && isString(target) && isResult(result);
};
