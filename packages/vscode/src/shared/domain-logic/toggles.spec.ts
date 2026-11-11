import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import { togglesOf } from './toggles.ts';
import type { Toggles } from '../common/scripts-toggle.type.ts';
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
    describe('WHEN the toggles are built', () => {
      let toggles: Toggles;

      beforeEach(() => {
        toggles = togglesOf(state, outputMock());
      });

      it('THEN scope reads true', () => {
        expect(toggles.scope.isShown()).toBe(true);
      });

      it('THEN scripts reads false', () => {
        expect(toggles.scripts.isShown()).toBe(false);
      });

      it('THEN prediction reads false', () => {
        expect(toggles.prediction.isShown()).toBe(false);
      });

      it('THEN affected reads false', () => {
        expect(toggles.affected.isShown()).toBe(false);
      });

      it('THEN each sends its own key', () => {
        expect(executeCommand.mock.calls).toStrictEqual([
          ['setContext', 'turboConsole.scriptsShown', false],
          ['setContext', 'turboConsole.scopeShown', true],
          ['setContext', 'turboConsole.predictionShown', false],
          ['setContext', 'turboConsole.affectedShown', false]
        ]);
      });
    });
  });
});
