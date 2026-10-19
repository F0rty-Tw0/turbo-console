import { loadWorkspace, readCachedWorkspace, resolveTurbo } from '@turbo-console/core';
import type { CachedWorkspace, TurboBinary, WorkspaceModel } from '@turbo-console/core';
import * as vscode from 'vscode';

import type { LoadDeps, SharedLoadPorts } from '../common/root.type.ts';

const PROGRESS_LOCATION = { viewId: 'turboConsole.tree' };

const PROGRESS_OPTIONS: vscode.ProgressOptions = { location: PROGRESS_LOCATION };

/** `turboConsole.turboPath`, read on every resolve so a changed setting applies to the next load; empty is unset. */
const overridePath = (): string | undefined => {
  const settings = vscode.workspace.getConfiguration('turboConsole');
  const value = settings.get<unknown>('turboPath');
  const isSet = typeof value === 'string' && value !== '';

  if (!isSet) return undefined;

  return value;
};

/**
 * One root's load ports over core (spec §4.3): resolve with the current `turboPath`, the disk cache in the editor's own
 * storage and the view's progress bar around a full load. Nothing is logged here: the session logs a failed load
 * once per error key and text, and the warnings of every model it applies, `loadRoot` the port errors, all through `shared.log`.
 */
export const coreLoadDeps = (root: string, shared: SharedLoadPorts): LoadDeps => {
  const resolve = async (signal: AbortSignal): Promise<TurboBinary> => {
    const path = overridePath();

    return resolveTurbo(root, { trusted: true, overridePath: path, signal });
  };
  const readCached = async (): Promise<CachedWorkspace | null> => readCachedWorkspace(root, shared.cacheDir);
  const load = async (binary: TurboBinary, signal: AbortSignal): Promise<WorkspaceModel> =>
    loadWorkspace(binary, { cacheDir: shared.cacheDir, signal });
  const progress = async (work: () => Promise<WorkspaceModel>): Promise<WorkspaceModel> =>
    vscode.window.withProgress(PROGRESS_OPTIONS, work);
  const deps: LoadDeps = { resolve, readCached, load, acquire: shared.acquire, progress, log: shared.log };

  return deps;
};
