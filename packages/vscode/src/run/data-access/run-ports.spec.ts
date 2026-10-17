import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { editorRunAllPorts } from './run-ports.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { SHOW_OUTPUT_ACTION } from '../common/run.const.ts';

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `run-ports.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = {
    showErrorMessage: vi.fn<(text: string, action: string) => Promise<string | undefined>>(),
    showInformationMessage: vi.fn<(text: string) => void>()
  };

  return spies;
});

vi.mock('vscode', () => {
  const window = { showErrorMessage: editor.showErrorMessage, showInformationMessage: editor.showInformationMessage };
  const module = { window };

  return module;
});

describe('FEATURE: run all editor ports', () => {
  const output: Output = { error: vi.fn(), warn: vi.fn(), show: vi.fn(), dispose: vi.fn() };
  const roots: Roots = { get: vi.fn(), all: vi.fn(), onDidChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    editor.showErrorMessage.mockResolvedValue(undefined);
  });

  it('GIVEN the run all ports WHEN a launch fails to start THEN the error toast names turbo, whatever the package manager', () => {
    const ports = editorRunAllPorts(roots, output);

    ports.notifyFailedToStart();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledExactlyOnceWith("Couldn't start turbo.", SHOW_OUTPUT_ACTION);
  });
});
