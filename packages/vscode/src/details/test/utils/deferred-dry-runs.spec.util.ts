import type { DryRunRequest, DryRunState } from '@turbo-console/core';
import type { DetailsState, HostMessage, PackageDetails, StateMessage } from '@turbo-console/webview-ui';
import { vi } from 'vitest';

import type { DetailsPorts } from '../../common/details.type.ts';
import type { DeferredDryRun } from '../common/details.type.ts';

/** Makes every `ports.dryRun` call pending until the spec settles it; returns the calls in start order. */
export const deferDryRuns = (ports: DetailsPorts): DeferredDryRun[] => {
  const runs: DeferredDryRun[] = [];
  const dryRun = async (request: DryRunRequest, signal: AbortSignal): Promise<DryRunState[]> => {
    const { promise, resolve, reject } = Promise.withResolvers<DryRunState[]>();

    runs.push({ request, signal, resolve, reject });

    return promise;
  };

  vi.mocked(ports.dryRun).mockImplementation(dryRun);

  return runs;
};

export const dryRunAt = (runs: DeferredDryRun[], index: number): DeferredDryRun => {
  const run = runs[index];

  if (run === undefined) throw new Error(`no dry run #${index}; ${runs.length} started`);

  return run;
};

/** Every message posted so far, in order. */
export const postedOf = (ports: DetailsPorts): HostMessage[] => vi.mocked(ports.post).mock.calls.map(([message]) => message);

const isStateMessage = (message: HostMessage): message is StateMessage => message.type === 'state';

const isPackage = (state: DetailsState): state is PackageDetails => state.kind === 'package';

/** The states of every `state` message posted so far, in order. */
export const postedStatesOf = (ports: DetailsPorts): DetailsState[] => {
  const posted = postedOf(ports);

  return posted.filter(isStateMessage).map((message) => message.state);
};

/** The dry-run phase of every `package` state posted so far, in order. */
export const postedPhasesOf = (ports: DetailsPorts): string[] => {
  const states = postedStatesOf(ports);

  return states.filter(isPackage).map((state) => state.dryRun);
};
