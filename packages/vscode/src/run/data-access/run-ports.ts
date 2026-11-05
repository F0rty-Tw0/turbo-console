import { randomUUID } from 'node:crypto';

import { matchRunTasks } from '@turbo-console/core';
import * as vscode from 'vscode';

import { canExecute } from './can-execute.ts';
import { editorRunLogPorts } from './run-log-fs.ts';
import { RunLogTails } from './run-log-tails.ts';
import { executeRunAllTask, executeScriptTask, executeTurboTask, isRunAllActive, isTurboTaskActive } from './turbo-tasks.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { PickItem } from '../common/picker.type.ts';
import type { RunAllPorts } from '../common/run-all.type.ts';
import { RUN_LOG_ID_LENGTH } from '../common/run-log-tail.const.ts';
import type { DependenciesOf } from '../common/run-progress.type.ts';
import type { RunSessionPorts, ShowError } from '../common/run.type.ts';
import { failedToStartNotice } from '../utils/run-notice.util.ts';

const after = (delayMs: number, action: () => void): void => {
  setTimeout(action, delayMs);
};

const randomId = (): string => randomUUID().slice(0, RUN_LOG_ID_LENGTH);

/** An information toast; nothing waits on its dismissal. */
export const showInfo = (text: string): void => {
  void vscode.window.showInformationMessage(text);
};

const showError: ShowError = (text, action) => vscode.window.showErrorMessage(text, action);

/**
 * The editor effects of the run flow; logs go to the output channel, which the failed to start notice offers to show.
 * Called once per window: it builds the window's log tails, whose degrade lines are warnings.
 */
export const editorRunPorts = (output: Output, dependenciesOf: (root: string) => DependenciesOf): RunSessionPorts => {
  const notifyFailedToStart = failedToStartNotice(showError, output.show);
  const logs = new RunLogTails(editorRunLogPorts(output.warn));
  const ports: RunSessionPorts = {
    canExecute,
    isActive: isTurboTaskActive,
    execute: executeTurboTask,
    executeScript: executeScriptTask,
    after,
    match: matchRunTasks,
    notifyFailedToStart,
    info: showInfo,
    log: output.error,
    now: () => Date.now(),
    dependenciesOf,
    randomId,
    logs
  };

  return ports;
};

const quickPick = async (items: PickItem[], placeHolder: string): Promise<PickItem | undefined> =>
  vscode.window.showQuickPick(items, { placeHolder });

/** The editor effects of run all: the same notice and output channel as a single run, and a quick pick for the picks. */
export const editorRunAllPorts = (roots: Roots, output: Output): RunAllPorts => {
  const notice = failedToStartNotice(showError, output.show);
  const ports: RunAllPorts = {
    canExecute,
    isActive: isRunAllActive,
    ensureLoaded: async (root) => {
      await roots.get(root)?.coordinator.ensureLoaded();
    },
    pick: quickPick,
    info: showInfo,
    execute: executeRunAllTask,
    after,
    log: output.error,
    notifyFailedToStart: () => {
      notice('turbo');
    }
  };

  return ports;
};
