import { isFile, isLimit, isWordOf } from './edge-imports.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import { ENTRY_TEXT_MAX, IMPORT_KINDS, IMPORT_SITES_MAX, MODULE_STUB_NAME_MAX } from '../../bridge/common/graph-message.const.ts';
import type { GraphModuleSitesMessage } from '../../bridge/common/graph-module-sites.type.ts';
import { isCount, isManifestLine } from '../../bridge/utils/number.util.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { isShortString, isString } from '../../bridge/utils/string.util.ts';

const isEnd = (end: unknown): boolean => {
  if (!isRecord(end)) return false;

  const { kind, path, name } = end;

  if (kind === 'file') return isString(path);

  if (kind === 'dir') return isString(path) && path !== '';

  return kind === 'stub' && isString(name);
};

const isTarget = (target: unknown): boolean => {
  if (!isRecord(target)) return false;

  const { kind, path, name } = target;

  if (kind === 'file') return isFile(path);

  return kind === 'stub' && isShortString(name, MODULE_STUB_NAME_MAX) && name !== '';
};

const isSite = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { file, line, text, kind, isType, target } = value;

  const isPlace = isFile(file) && isManifestLine(line);
  const isWords = isShortString(text, ENTRY_TEXT_MAX + 1) && isWordOf(IMPORT_KINDS, kind);

  return isPlace && isWords && typeof isType === 'boolean' && isTarget(target);
};

const isSites = (sites: unknown, total: unknown): boolean => {
  if (!Array.isArray(sites) || sites.length > IMPORT_SITES_MAX) return false;

  const isTotal = isCount(total) && total >= sites.length;

  return isTotal && sites.every(isSite);
};

const isFound = (result: UnknownRecord): boolean => {
  const { imports, importsTotal, importedBy, importedByTotal, limit } = result;

  return isSites(imports, importsTotal) && isSites(importedBy, importedByTotal) && isLimit(limit);
};

const isResult = (result: unknown): boolean => {
  if (!isRecord(result)) return false;

  if (result['kind'] === 'failed') return true;

  return result['kind'] === 'found' && isFound(result);
};

/** Whether a posted value is a whole `moduleSites` answer (spec §5.1): its package name, both ends and every site; text may be one character past the host's cut (the `…`). */
export const isModuleSitesMessage = (value: unknown): value is GraphModuleSitesMessage => {
  if (!isRecord(value)) return false;

  const { packageName, from, to, result } = value;
  const isTo = to === null || isEnd(to);

  return isString(packageName) && isEnd(from) && isTo && isResult(result);
};
