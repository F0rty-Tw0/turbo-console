import { describe, expect, it, vi } from 'vitest';

import { treeDepsOf } from './tree-deps.ts';
import type { Timings } from '../../shared/common/api.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';
import { SHARED_ATOMS_STUB } from '../test/stubs/shared-atoms.stub.ts';
import { TIMINGS_STUB } from '../test/stubs/timings.stub.ts';

/** The `executeCommand` the hoisted `vscode` mock hands out, so a case reads what the context-key sends asked for. */
const executeCommand = vi.hoisted(() => vi.fn(async (): Promise<void> => Promise.resolve()));

vi.mock('vscode', () => {
  const commands = { executeCommand };
  const module = { commands };

  return module;
});

const RUNS: TreeProviderDeps['runs'] = { get: () => undefined, runningIds: () => new Set() };

describe('FEATURE: tree provider deps', () => {
  describe('GIVEN a run lookup, timings, a scripts toggle, shared Atomizer loads and a log', () => {
    it('WHEN the deps are built THEN they carry the lookup, the tree-visible spans, the toggle, the shared loads and the log', () => {
      const scripts = scriptsToggleMock();
      const treeVisible = new Map([['/ws', { start: 1, end: 2 }]]);
      const timings: Timings = { ...TIMINGS_STUB, treeVisible };
      const log = vi.fn();

      const deps = treeDepsOf(RUNS, timings, scripts, SHARED_ATOMS_STUB, log);

      expect(deps).toStrictEqual({
        runs: RUNS,
        treeVisible,
        scripts,
        atom: SHARED_ATOMS_STUB,
        setHasScripts: deps.setHasScripts,
        setSinglePackage: deps.setSinglePackage,
        log
      });
    });

    it('WHEN setHasScripts sends true THEN the turboConsole.hasScripts context key is set to true', async () => {
      const deps = treeDepsOf(RUNS, TIMINGS_STUB, scriptsToggleMock(), SHARED_ATOMS_STUB, vi.fn());

      await deps.setHasScripts(true);

      expect(executeCommand).toHaveBeenCalledWith('setContext', 'turboConsole.hasScripts', true);
    });

    it('WHEN setSinglePackage sends true THEN the turboConsole.singlePackage context key is set to true', async () => {
      const deps = treeDepsOf(RUNS, TIMINGS_STUB, scriptsToggleMock(), SHARED_ATOMS_STUB, vi.fn());

      await deps.setSinglePackage(true);

      expect(executeCommand).toHaveBeenCalledWith('setContext', 'turboConsole.singlePackage', true);
    });
  });

  describe('GIVEN setContext rejects', () => {
    it('WHEN setHasScripts sends THEN its promise rejects with that error', async () => {
      const error = new Error('setContext failed');

      executeCommand.mockRejectedValueOnce(error);
      const deps = treeDepsOf(RUNS, TIMINGS_STUB, scriptsToggleMock(), SHARED_ATOMS_STUB, vi.fn());

      await expect(deps.setHasScripts(true)).rejects.toBe(error);
    });

    it('WHEN setSinglePackage sends THEN its promise rejects with that error', async () => {
      const error = new Error('setContext failed');

      executeCommand.mockRejectedValueOnce(error);
      const deps = treeDepsOf(RUNS, TIMINGS_STUB, scriptsToggleMock(), SHARED_ATOMS_STUB, vi.fn());

      await expect(deps.setSinglePackage(true)).rejects.toBe(error);
    });
  });
});
