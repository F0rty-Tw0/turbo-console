import * as vscode from 'vscode';

import { showInfo } from './run-ports.ts';
import type { InputAsk, OptionItem, RunOptionsPorts } from '../common/run-options.type.ts';
import type { RunControl } from '../common/run.type.ts';

const pickMany = async (items: OptionItem[], placeHolder: string): Promise<OptionItem[] | undefined> =>
  vscode.window.showQuickPick(items, { canPickMany: true, placeHolder });

const input = async (ask: InputAsk): Promise<string | undefined> => {
  const validateInput = (value: string): string | undefined => ask.validate(value) ?? undefined;

  return vscode.window.showInputBox({ prompt: ask.prompt, placeHolder: ask.placeholder, validateInput });
};

/** The editor effects of Run with Options: a multi-select picker, a validated box (closing on focus loss), a toast, the run. */
export const editorRunOptionsPorts = (control: Pick<RunControl, 'run'>): RunOptionsPorts => {
  const ports: RunOptionsPorts = { pickMany, input, info: showInfo, run: control.run };

  return ports;
};
