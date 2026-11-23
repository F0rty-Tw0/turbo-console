import { savedWith } from './graph-saved-state.spec.util.ts';
import type { ModuleLink, ModulesFound } from '../../../src/bridge/common/graph-modules.type.ts';
import type { GraphViewState, ModulesViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { MODULES_APP_STUB } from '../stubs/graph-modules.stub.ts';
import { TASK_MODE_STATE_STUB } from '../stubs/graph-task-mode.stub.ts';

const CAP_FOLDERS = 250;

const CAP_FILES_PER_FOLDER = 20;

const CAP_FILES = CAP_FOLDERS * CAP_FILES_PER_FOLDER;

const CAP_STUBS = 50;

/** Each stub is imported by every hundredth file. */
const CAP_STUB_STRIDE = 100;

const paddedOf = (value: number, width: number): string => String(value).padStart(width, '0');

const flatFileOf = (index: number): string => `f${paddedOf(index, 3)}.ts`;

const capFileOf = (index: number): string => {
  const folder = Math.floor(index / CAP_FILES_PER_FOLDER);
  const file = index % CAP_FILES_PER_FOLDER;

  return `m${paddedOf(folder, 3)}/f${paddedOf(file, 2)}.ts`;
};

const capStubOf = (index: number): string => `@s/p${paddedOf(index, 2)}`;

/** File `index` statically imports the file one folder on, the last folder wrapping to the first. */
const capFileLinkOf = (index: number): ModuleLink => [index, (index + CAP_FILES_PER_FOLDER) % CAP_FILES, 1, 0, 0];

const capStubLinkOf = (index: number): ModuleLink => [index * CAP_STUB_STRIDE, index, 1, 0, 0];

/** `count` files `f000.ts` … at the package root, with no link and no stub, so the root box draws `count` file leaves. */
export const flatModulesOf = (count: number): ModulesFound => {
  const files = Array.from({ length: count }, (_, index): string => flatFileOf(index));
  const found: ModulesFound = { ...MODULES_APP_STUB, files, tests: [], stubs: [], fileLinks: [], stubLinks: [], scanned: count };

  return found;
};

/**
 * 5000 files in 250 root folders of 20 (`m000/f00.ts` … `m249/f19.ts`) and 50 stubs `@s/p00` … `@s/p49`. D9 opens only the
 * root, so the drawn leaves are the 250 collapsed folders and the 50 stubs: exactly `MODULE_SHOWN_CAP`.
 */
export const modulesAtCapOf = (): ModulesFound => {
  const files = Array.from({ length: CAP_FILES }, (_, index): string => capFileOf(index));
  const stubs = Array.from({ length: CAP_STUBS }, (_, index): string => capStubOf(index));
  const fileLinks = Array.from({ length: CAP_FILES }, (_, index): ModuleLink => capFileLinkOf(index));
  const stubLinks = Array.from({ length: CAP_STUBS }, (_, index): ModuleLink => capStubLinkOf(index));
  const found: ModulesFound = { ...MODULES_APP_STUB, files, tests: [], stubs, fileLinks, stubLinks, scanned: CAP_FILES };

  return found;
};

const ALL_SHOWN: ModulesViewState['shown'] = { types: true, tests: true, lazies: true };

/** A saved view of `TASK_MODE_STATE_STUB`'s hash in modules mode on `packageName`, not set up yet: D9 and a fit on first Shown. */
export const modulesSavedState = (packageName: string): GraphViewState => {
  const modules: ModulesViewState = { packageName, expanded: null, shown: ALL_SHOWN, camera: null };

  return savedWith(TASK_MODE_STATE_STUB.hash, { mode: 'modules', modules });
};
