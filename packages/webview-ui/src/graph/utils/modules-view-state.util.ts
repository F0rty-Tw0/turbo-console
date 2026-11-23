import { isNameList, readCamera } from './saved-fields.util.ts';
import type { ModulesCamera, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';

const readExpanded = (value: unknown): string[] | null => {
  if (!isNameList(value)) return null;

  return [...value];
};

const NO_FIELDS: Record<string, unknown> = {};

const readFlag = (value: unknown): boolean => (typeof value === 'boolean' ? value : true);

const readShown = (raw: unknown): ModulesViewState['shown'] => {
  const fields = isRecord(raw) ? raw : NO_FIELDS;
  const shown: ModulesViewState['shown'] = {
    types: readFlag(fields['types']),
    tests: readFlag(fields['tests']),
    lazies: readFlag(fields['lazies'])
  };

  return shown;
};

const readModulesCamera = (raw: unknown): ModulesCamera | null => {
  if (!isRecord(raw)) return null;

  return readCamera(raw['zoom'], raw['pan']);
};

/** The saved modules view, rebuilt field by field; `null` without a package name, a bad expansion sets up again, a bad flag shows its kind, a bad camera fits. */
export const readModules = (raw: unknown): ModulesViewState | null => {
  if (!isRecord(raw)) return null;

  const { packageName } = raw;

  if (typeof packageName !== 'string') return null;

  const modules: ModulesViewState = {
    packageName,
    expanded: readExpanded(raw['expanded']),
    shown: readShown(raw['shown']),
    camera: readModulesCamera(raw['camera'])
  };

  return modules;
};
