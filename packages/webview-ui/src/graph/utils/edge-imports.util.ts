import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import {
  ENTRY_TEXT_MAX,
  IMPORT_KINDS,
  IMPORT_LIMITS,
  IMPORT_SITES_MAX,
  IMPORT_VIAS,
  MANIFEST_FILE_MAX,
  MANIFEST_LINE_MAX
} from '../../bridge/common/graph-message.const.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { isShortString, isString } from '../../bridge/utils/string.util.ts';

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isWordOf = (table: Readonly<Record<string, true>>, value: unknown): boolean => isString(value) && Object.hasOwn(table, value);

const isLimit = (limit: unknown): boolean => limit === null || isWordOf(IMPORT_LIMITS, limit);

const isLine = (line: unknown): boolean => {
  if (typeof line !== 'number') return false;

  const isWhole = Number.isInteger(line);

  return isWhole && line >= 0 && line <= MANIFEST_LINE_MAX;
};

const isFile = (file: unknown): boolean => isShortString(file, MANIFEST_FILE_MAX) && file !== '';

const isSite = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { file, line, specifier, text, kind, via, isType } = value;

  const isPlace = isFile(file) && isLine(line);
  const isCut = isShortString(specifier, ENTRY_TEXT_MAX + 1) && isShortString(text, ENTRY_TEXT_MAX + 1);
  const isWords = isWordOf(IMPORT_KINDS, kind) && isWordOf(IMPORT_VIAS, via);

  return isPlace && isCut && isWords && typeof isType === 'boolean';
};

const isSites = (sites: unknown, total: unknown): boolean => {
  if (!Array.isArray(sites)) return false;

  const isCounted = sites.length >= 1 && sites.length <= IMPORT_SITES_MAX;
  const isTotal = isCount(total) && total >= sites.length;

  return isCounted && isTotal && sites.every(isSite);
};

const isCounts = (result: UnknownRecord): boolean => {
  const { scanned, skipped, limit } = result;

  return isCount(scanned) && isCount(skipped) && isLimit(limit);
};

const isResult = (result: unknown): boolean => {
  if (!isRecord(result)) return false;

  const { kind, sites, total } = result;

  if (kind === 'failed') return true;

  const areCountsFit = isCounts(result);

  if (kind === 'none') return areCountsFit;

  return kind === 'found' && areCountsFit && isSites(sites, total);
};

/** Whether the whole `edgeImports` record has its two package names and a result the page can show (spec D11, D13); text may be up to one character past the host's cut (the `…`). */
export const isEdgeImports = (value: UnknownRecord): boolean => {
  const { source, target, result } = value;

  return isString(source) && isString(target) && isResult(result);
};
