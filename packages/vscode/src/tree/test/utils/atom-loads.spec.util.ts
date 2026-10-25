import type { AtomResult, DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';
import { vi } from 'vitest';

import { TURBO_BINARY_STUB } from '../../../roots/test/stubs/root.stub.ts';
import type { AtomLoadPorts } from '../../common/atom-load.type.ts';
import { FILE_A, PKG, ROOT } from '../common/atom-loads.const.ts';
import type { ChildrenRequester, DeferredDryRun, DeferredScan, LoadsHarness } from '../common/atom-loads.type.ts';
import { ATOM_RESULT_STUB, BASE_MODEL_STUB, DRY_RUN_STATE_STUB } from '../stubs/atom-loads.stub.ts';

/** A dry-run state of task `id` with cache state `cache`. */
export const dryStateOf = (id: string, cache: DryRunState['cache']): DryRunState => {
  const state: DryRunState = { ...DRY_RUN_STATE_STUB, id, cache };

  return state;
};

/** Lets every pending promise callback run, so a settled port call has reached the loads. */
export const flush = async (): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  const done = (): void => {
    resolve(undefined);
  };

  setImmediate(done);

  await promise;
};

/** `AtomLoads` over spied ports whose `dryRun` and `results` calls stay pending until the spec settles them. */
export const loadsHarness = (): LoadsHarness => {
  const dryRuns: DeferredDryRun[] = [];
  const scans: DeferredScan[] = [];
  const models = new Map<string, WorkspaceModel | null>();
  let hasBinary = true;
  const dryRunPort = async (binary: TurboBinary, request: DryRunRequest, signal: AbortSignal): Promise<DryRunState[]> => {
    const { promise, resolve, reject } = Promise.withResolvers<DryRunState[]>();

    dryRuns.push({ binary, request, signal, resolve, reject });

    return promise;
  };
  const resultsPort = async (): Promise<Map<string, AtomResult>> => {
    const { promise, resolve, reject } = Promise.withResolvers<Map<string, AtomResult>>();

    scans.push({ resolve, reject });

    return promise;
  };
  const binaryOf = vi.fn<AtomLoadPorts['binaryOf']>(() => (hasBinary ? TURBO_BINARY_STUB : null));
  const dryRun = vi.fn<AtomLoadPorts['dryRun']>(dryRunPort);
  const results = vi.fn<AtomLoadPorts['results']>(resultsPort);
  const log = vi.fn<AtomLoadPorts['log']>();
  const changed = vi.fn<AtomLoadPorts['changed']>();
  const ports: AtomLoadPorts = { binaryOf, dryRun, results, log, changed };
  const modelOf = (root: string): WorkspaceModel | null => models.get(root) ?? null;
  const model = (root: string, next: WorkspaceModel | null): void => {
    models.set(root, next);
  };
  const noBinary = (): void => {
    hasBinary = false;
  };
  const binary = (): void => {
    hasBinary = true;
  };
  const harness: LoadsHarness = { ports, modelOf, binaryOf, dryRun, results, log, changed, dryRuns, scans, model, noBinary, binary };

  return harness;
};

/** The `index`th `dryRun` call; a spec that settles a call that never started fails here, by name. */
export const dryRunAt = (h: LoadsHarness, index: number): DeferredDryRun => {
  const call = h.dryRuns[index];

  if (call === undefined) throw new Error(`no dry-run #${index}; ${h.dryRuns.length} started`);

  return call;
};

/** The `index`th `results` call; a spec that settles a call that never started fails here, by name. */
export const scanAt = (h: LoadsHarness, index: number): DeferredScan => {
  const call = h.scans[index];

  if (call === undefined) throw new Error(`no scan #${index}; ${h.scans.length} started`);

  return call;
};

/** Package `PKG` of `ROOT` loading: the base model set, children requested, both parts pending. */
export const toLoading = (h: LoadsHarness, loads: ChildrenRequester): void => {
  h.model(ROOT, BASE_MODEL_STUB);
  loads.childrenRequested(ROOT, PKG);
};

/** `toLoading`, then both parts settle OK: `FILE_A` is a HIT and has a passed result. */
export const toLoaded = async (h: LoadsHarness, loads: ChildrenRequester): Promise<void> => {
  const results = new Map<string, AtomResult>([[FILE_A, ATOM_RESULT_STUB]]);

  toLoading(h, loads);
  dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
  scanAt(h, 0).resolve(results);

  await flush();
};

/** `toLoading`, then both parts reject. */
export const toFailed = async (h: LoadsHarness, loads: ChildrenRequester): Promise<void> => {
  toLoading(h, loads);
  dryRunAt(h, 0).reject(new Error('dry-run boom'));
  scanAt(h, 0).reject(new Error('scan boom'));

  await flush();
};
