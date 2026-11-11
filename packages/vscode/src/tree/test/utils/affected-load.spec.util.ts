import type { AffectedResult, TurboBinary, WorkspaceModel } from '@turbo-console/core';
import { vi } from 'vitest';

import { affectedResultOf } from './affected-result.spec.util.ts';
import { flush } from './atom-load.spec.util.ts';
import { buildModelOf } from './prediction-model.spec.util.ts';
import { TURBO_BINARY_STUB } from '../../../roots/test/stubs/root.stub.ts';
import type { AffectedLoadPorts } from '../../common/affected.type.ts';
import type { AffectedDriver, AffectedHarness, AffectedState, DeferredRead } from '../common/affected-load.type.ts';
import { ROOT } from '../common/atom-load.const.ts';
import { ID_A, NOW_0, PKG_A } from '../common/prediction-load.const.ts';

const readPortOf = (reads: DeferredRead[]): AffectedLoadPorts['readAffected'] => {
  const port = async (binary: TurboBinary, signal: AbortSignal): Promise<AffectedResult> => {
    const { promise, resolve, reject } = Promise.withResolvers<AffectedResult>();

    reads.push({ binary, signal, resolve, reject });

    return promise;
  };

  return port;
};

/** `AffectedLoads` ports over spies: `readAffected` calls stay pending, `now` starts at `NOW_0`. */
export const affectedHarness = (): AffectedHarness => {
  const reads: DeferredRead[] = [];
  const models = new Map<string, WorkspaceModel | null>();
  let hasBinary = true;
  let now = NOW_0;
  const readPort = readPortOf(reads);
  const binaryOf = vi.fn<AffectedLoadPorts['binaryOf']>(() => (hasBinary ? TURBO_BINARY_STUB : null));
  const readAffected = vi.fn<AffectedLoadPorts['readAffected']>(readPort);
  const log = vi.fn<AffectedLoadPorts['log']>();
  const changed = vi.fn<AffectedLoadPorts['changed']>();
  const modelOf = (root: string): WorkspaceModel | null => models.get(root) ?? null;
  const readNow = (): number => now;
  const ports: AffectedLoadPorts = { binaryOf, modelOf, readAffected, now: readNow, log, changed };
  const setNow = (ms: number): void => {
    now = ms;
  };
  const model = (root: string, next: WorkspaceModel | null): void => {
    models.set(root, next);
  };
  const noBinary = (): void => {
    hasBinary = false;
  };
  const binary = (): void => {
    hasBinary = true;
  };
  const harness: AffectedHarness = { ports, readAffected, reads, log, changed, setNow, model, noBinary, binary };

  return harness;
};

/** The `index`th `readAffected` call; a spec that settles a call that never started fails here, by name. */
export const readAt = (h: Pick<AffectedHarness, 'reads'>, index: number): DeferredRead => {
  const call = h.reads[index];

  if (call === undefined) throw new Error(`no read #${index}; ${h.reads.length} started`);

  return call;
};

/** `ROOT` driven into `state`: loading after the show, then settled OK (one kept task `ID_A`) or rejected. */
export const toState = async (h: AffectedHarness, store: AffectedDriver, state: AffectedState): Promise<void> => {
  h.model(ROOT, buildModelOf([PKG_A]));
  store.toggled(true);
  store.rootShown(ROOT);

  if (state === 'loading') return;

  if (state === 'loaded') readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));

  if (state === 'failed') readAt(h, 0).reject(new Error('boom'));

  await flush();
};
