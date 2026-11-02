import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import { editorTogglePorts } from './scripts-toggle-ports.ts';
import { outputMock } from '../test/mocks/output.mock.ts';

type ExecuteCommand = (command: string, key: string, value: boolean) => Promise<void>;

/** `vscode` exists only inside the editor, so the module is replaced here by the one call `scripts-toggle-ports.ts` makes. */
const executeCommand = vi.hoisted(() => vi.fn<ExecuteCommand>(async () => Promise.resolve()));

vi.mock('vscode', () => {
  const commands = { executeCommand };
  const module = { commands };

  return module;
});

const memento: vscode.Memento = { get: vi.fn(), update: vi.fn(), keys: () => [] };

describe('FEATURE: toggle ports', () => {
  beforeEach(() => {
    executeCommand.mockClear();
  });

  describe.each(['turboConsole.scopeShown', 'turboConsole.scriptsShown'])('GIVEN the key %s', (key) => {
    it('WHEN setKey sends true THEN setContext gets that key and true', async () => {
      const ports = editorTogglePorts(memento, outputMock());

      await ports.setKey(key, true);

      expect(executeCommand).toHaveBeenCalledExactlyOnceWith('setContext', key, true);
    });
  });

  describe('GIVEN a workspace state and an output', () => {
    it('WHEN the ports are built THEN the store is the workspace state and log is the output error', () => {
      const output = outputMock();

      const ports = editorTogglePorts(memento, output);

      expect(ports.store).toBe(memento);
      expect(ports.log).toBe(output.error);
    });
  });
});
