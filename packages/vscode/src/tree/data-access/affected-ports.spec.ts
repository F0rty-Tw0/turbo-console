import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { editorAffectedPorts } from './affected-ports.ts';
import type { RootEntry, RootState } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { rootsMock } from '../../roots/test/mocks/roots.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { outputMock } from '../../shared/test/mocks/output.mock.ts';
import type { AffectedHostPorts } from '../common/affected.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';

const readAffectedMock = vi.hoisted(() => vi.fn());

vi.mock('@turbo-console/core', async (original) => {
  const actual = await original<object>();
  const mocked = { ...actual, readAffected: readAffectedMock };

  return mocked;
});

const LOADED_STATE: RootState = { ...ROOT_STATE_STUB, binary: TURBO_BINARY_STUB };

const envOf = (base: string | undefined, head: string | undefined): NodeJS.ProcessEnv => {
  const pairs: [string, string | undefined][] = [
    ['TURBO_SCM_BASE', base],
    ['TURBO_SCM_HEAD', head]
  ];
  const set = pairs.filter(([, value]) => value !== undefined);
  const env: NodeJS.ProcessEnv = Object.fromEntries(set);

  return env;
};

describe('FEATURE: editor affected ports', () => {
  let output: Output;
  let roots: ReturnType<typeof rootsMock>;

  beforeEach(() => {
    const entry: RootEntry = { state: LOADED_STATE, coordinator: coordinatorMock() };

    readAffectedMock.mockReset();
    readAffectedMock.mockResolvedValue(affectedResultOf([]));
    output = outputMock();
    roots = rootsMock(new Map([['/ws', entry]]));
  });

  describe('GIVEN a store holding one loaded root', () => {
    let ports: AffectedHostPorts;

    beforeEach(() => {
      ports = editorAffectedPorts(roots, output, {});
    });

    it('WHEN the binary of the loaded root is read THEN it is the turbo the root loaded with', () => {
      expect(ports.binaryOf('/ws')).toBe(TURBO_BINARY_STUB);
    });

    it('WHEN the binary of an unknown root is read THEN it is null', () => {
      expect(ports.binaryOf('/gone')).toBeNull();
    });

    it('WHEN a line is logged THEN the output gets it as one warning', () => {
      ports.log('affected /ws: boom');

      expect(output.warn).toHaveBeenCalledExactlyOnceWith('affected /ws: boom');
    });
  });

  describe.each([
    ['both set', 'HEAD~1', 'HEAD', { base: 'HEAD~1', head: 'HEAD' }],
    ['only base set', 'main', undefined, { base: 'main', head: undefined }],
    ['empty strings', '', '', { base: undefined, head: undefined }],
    ['neither set', undefined, undefined, { base: undefined, head: undefined }]
  ])('GIVEN env %s', (_name, base, head, refs) => {
    it('WHEN readAffected runs THEN core gets base and head and the caller signal', async () => {
      const signal = new AbortController().signal;
      const ports = editorAffectedPorts(roots, output, envOf(base, head));

      await ports.readAffected(TURBO_BINARY_STUB, signal);

      expect(readAffectedMock).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, { ...refs, signal });
    });
  });

  describe('GIVEN no env argument and TURBO_SCM_BASE stubbed on process.env', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('WHEN readAffected runs THEN base is the stubbed value', async () => {
      vi.stubEnv('TURBO_SCM_BASE', 'abc');
      vi.stubEnv('TURBO_SCM_HEAD', '');

      const ports = editorAffectedPorts(roots, output);

      await ports.readAffected(TURBO_BINARY_STUB, new AbortController().signal);

      expect(readAffectedMock.mock.calls[0]?.[1]).toMatchObject({ base: 'abc', head: undefined });
    });
  });

  describe('GIVEN a fake clock at 5 s', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN now is read THEN it is the clock', () => {
      vi.useFakeTimers();
      vi.setSystemTime(5_000);

      expect(editorAffectedPorts(roots, output, {}).now()).toBe(5_000);
    });
  });
});
