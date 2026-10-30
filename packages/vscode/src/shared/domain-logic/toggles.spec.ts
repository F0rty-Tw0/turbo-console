import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import { togglesOf } from './toggles.ts';
import { outputMock } from '../test/mocks/output.mock.ts';

type ExecuteCommand = (command: string, key: string, value: boolean) => Promise<void>;

/** `vscode` exists only inside the editor, so the module is replaced here by the one call the editor ports make. */
const executeCommand = vi.hoisted(() => vi.fn<ExecuteCommand>(async () => Promise.resolve()));

vi.mock('vscode', () => {
  const commands = { executeCommand };
  const module = { commands };

  return module;
});

describe('FEATURE: toggles', () => {
  const stored = new Map<string, unknown>([['turboConsole.scopeShown', true]]);
  const get = vi.fn();
  const state: vscode.Memento = { get, update: vi.fn(), keys: () => [] };

  beforeEach(() => {
    executeCommand.mockClear();
    get.mockImplementation((key: string) => stored.get(key));
  });

  describe('GIVEN a stored scopeShown of true and no scriptsShown', () => {
    it('WHEN the toggles are built THEN scope reads true, scripts reads false, and each sends its own key', () => {
      const { scripts, scope } = togglesOf(state, outputMock());

      expect(scope.isShown()).toBe(true);
      expect(scripts.isShown()).toBe(false);
      expect(executeCommand.mock.calls).toStrictEqual([
        ['setContext', 'turboConsole.scriptsShown', false],
        ['setContext', 'turboConsole.scopeShown', true]
      ]);
    });
  });
});
