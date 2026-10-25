import type { DryRunRequest } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { editorAtomPorts } from './atom-ports.ts';
import type { RootEntry, RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';

const DRY_RUN_REQUEST: DryRunRequest = { tasks: ['e2e-ci'], packages: ['@fx/e2e'], singlePackage: false };

const LOADED_STATE: RootState = { ...ROOT_STATE_STUB, binary: TURBO_BINARY_STUB };

describe('FEATURE: editor Atomizer ports', () => {
  describe('GIVEN a store holding one loaded root', () => {
    let roots: Roots;
    let output: Output;

    beforeEach(() => {
      const entry: RootEntry = { state: LOADED_STATE, coordinator: coordinatorMock() };
      const entries = new Map([['/ws', entry]]);

      roots = { get: (root: string): RootEntry | undefined => entries.get(root), all: vi.fn(), onDidChange: vi.fn() };
      output = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    });

    it('WHEN the binary of that root is read THEN it is the turbo the root loaded with', () => {
      const binary = editorAtomPorts(roots, output).binaryOf('/ws');

      expect(binary).toBe(TURBO_BINARY_STUB);
    });

    it('WHEN the binary of an unknown root is read THEN it is null', () => {
      const binary = editorAtomPorts(roots, output).binaryOf('/gone');

      expect(binary).toBeNull();
    });

    it('WHEN the dry run starts with an aborted signal THEN core aborts it before the binary is run', async () => {
      const controller = new AbortController();

      controller.abort();

      const dryRun = editorAtomPorts(roots, output).dryRun(TURBO_BINARY_STUB, DRY_RUN_REQUEST, controller.signal);

      await expect(dryRun).rejects.toThrow('was aborted');
    });

    it('WHEN a line is logged THEN the output gets it as one warning', () => {
      editorAtomPorts(roots, output).log('atoms @fx/e2e: scan failed: boom');

      expect(output.warn).toHaveBeenCalledExactlyOnceWith('atoms @fx/e2e: scan failed: boom');
    });
  });
});
