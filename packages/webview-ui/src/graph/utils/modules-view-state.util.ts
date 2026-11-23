import { isNameList, readCamera, readDepth } from './saved-fields.util.ts';
import type { ModuleSelection, ModulesCamera, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { DIR_PREFIX, FILE_PREFIX, FRESH_MODULES_SHOWN, STUB_PREFIX } from '../common/graph-module.const.ts';

const readExpanded = (value: unknown): string[] | null => {
  if (!isNameList(value)) return null;

  return [...value];
};

const NO_FIELDS: Record<string, unknown> = {};

const readFlag = (value: unknown, fresh: boolean): boolean => (typeof value === 'boolean' ? value : fresh);

const readShown = (raw: unknown): ModulesViewState['shown'] => {
  const fields = isRecord(raw) ? raw : NO_FIELDS;
  const shown: ModulesViewState['shown'] = {
    types: readFlag(fields['types'], FRESH_MODULES_SHOWN.types),
    tests: readFlag(fields['tests'], FRESH_MODULES_SHOWN.tests),
    lazies: readFlag(fields['lazies'], FRESH_MODULES_SHOWN.lazies)
  };

  return shown;
};

const readModulesCamera = (raw: unknown): ModulesCamera | null => {
  if (!isRecord(raw)) return null;

  return readCamera(raw['zoom'], raw['pan']);
};

/** A file or stub id; never a folder (Ruling R1). */
const isNodeId = (value: unknown): value is string =>
  typeof value === 'string' && (value.startsWith(FILE_PREFIX) || value.startsWith(STUB_PREFIX));

/** A node id, or a folder id other than the root box. */
const isLinkEnd = (value: unknown): value is string => {
  const isFolder = typeof value === 'string' && value.startsWith(DIR_PREFIX) && value.length > DIR_PREFIX.length;

  return isNodeId(value) || isFolder;
};

const readSelection = (raw: unknown): ModuleSelection | null => {
  if (!isRecord(raw)) return null;

  const { kind, id, source, target } = raw;

  if (kind === 'node' && isNodeId(id)) {
    const node: ModuleSelection = { kind, id };

    return node;
  }

  const isLink = kind === 'link' && isLinkEnd(source) && isLinkEnd(target);

  if (!isLink) return null;

  const link: ModuleSelection = { kind, source, target };

  return link;
};

const readModuleFocus = (value: unknown): string | null => (isNodeId(value) ? value : null);

/** The saved modules view, rebuilt field by field; `null` without a package name, a bad expansion sets up again, a bad flag reads as a fresh view's, a bad camera fits, a bad selection or focus reads `null` and a bad depth reads `DEFAULT_DEPTH`. */
export const readModules = (raw: unknown): ModulesViewState | null => {
  if (!isRecord(raw)) return null;

  const { packageName } = raw;

  if (typeof packageName !== 'string') return null;

  const modules: ModulesViewState = {
    packageName,
    expanded: readExpanded(raw['expanded']),
    shown: readShown(raw['shown']),
    camera: readModulesCamera(raw['camera']),
    selected: readSelection(raw['selected']),
    focus: readModuleFocus(raw['focus']),
    depth: readDepth(raw['depth'])
  };

  return modules;
};
