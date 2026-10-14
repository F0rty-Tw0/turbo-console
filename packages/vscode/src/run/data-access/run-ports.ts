import { matchRunSummary } from '@turbo-console/core';
import * as vscode from 'vscode';

import { canExecute } from './can-execute.ts';
import { executeRunAllTask, executeTurboTask, isRunAllActive, isTurboTaskActive } from './turbo-tasks.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { PickItem } from '../common/picker.type.ts';
import type { RunAllPorts } from '../common/run-all.type.ts';
import type { RunPorts, ShowError } from '../common/run.type.ts';
import { failedToStartNotice } from '../utils/run-notice.util.ts';

const after = (delayMs: number, action: () => void): void => {
  setTimeout(action, delayMs);
};

const showError: ShowError = (text, action) => vscode.window.showErrorMessage(text, action);

/** The editor effects of the run flow; logs go to the output channel, which the failed to start notice offers to show. */
export const editorRunPorts = (output: Output): RunPorts => {
  const notifyFailedToStart = failedToStartNotice(showError, output.show);
  const ports: RunPorts = {
    canExecute,
    isActive: isTurboTaskActive,
    execute: executeTurboTask,
    after,
    match: matchRunSummary,
    notifyFailedToStart,
    info: (text) => {
      void vscode.window.showInformationMessage(text);
    },
    log: output.error,
    now: () => Date.now()
  };

  return ports;
};

const quickPick = async (items: PickItem[], placeHolder: string): Promise<PickItem | undefined> =>
  vscode.window.showQuickPick(items, { placeHolder });

/** The editor effects of run all: the same notice and output channel as a single run, and a quick pick for the picks. */
export const editorRunAllPorts = (roots: Roots, output: Output): RunAllPorts => {
  const notifyFailedToStart = failedToStartNotice(showError, output.show);
  const ports: RunAllPorts = {
    canExecute,
    isActive: isRunAllActive,
    ensureLoaded: async (root) => {
      await roots.get(root)?.coordinator.ensureLoaded();
    },
    pick: quickPick,
    info: (text) => {
      void vscode.window.showInformationMessage(text);
    },
    execute: executeRunAllTask,
    after,
    log: output.error,
    notifyFailedToStart
  };

  return ports;
};
