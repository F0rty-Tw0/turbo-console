import { matchRunSummary } from '@turbo-console/core';
import * as vscode from 'vscode';

import { canExecute } from './can-execute.ts';
import { executeTurboTask, isTurboTaskActive } from './turbo-tasks.ts';
import type { Output } from '../../shared/common/output.type.ts';
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
