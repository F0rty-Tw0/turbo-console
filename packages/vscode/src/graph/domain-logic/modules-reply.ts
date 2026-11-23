import type { ModuleSitesQuery } from '@turbo-console/core';
import type {
  GraphModuleSitesMessage,
  GraphPackage,
  GraphPackageModulesMessage,
  GraphReady,
  GraphState,
  ModuleEnd,
  ModuleSitesResult,
  ModulesResult
} from '@turbo-console/webview-ui';

import type { ScanGate } from '../common/graph.type.ts';
import type { AnsweredOutcome, ModulesContext } from '../common/import-match.type.ts';
import { packagesByName } from '../utils/graph-package.util.ts';
import { answerModuleSites } from '../utils/module-sites-answer.util.ts';
import { answerModules } from '../utils/modules-answer.util.ts';

/** A package the graph lists now, with the graph that lists it. */
type ListedPackage = {
  readonly state: GraphReady;
  readonly pkg: GraphPackage;
};

const FAILED_MODULES: ModulesResult = { kind: 'failed' };

const FAILED_SITES: ModuleSitesResult = { kind: 'failed' };

/** The `failed` reply for `packageName`. */
export const failedModulesOf = (packageName: string): GraphPackageModulesMessage => {
  const failed: GraphPackageModulesMessage = { type: 'packageModules', packageName, result: FAILED_MODULES };

  return failed;
};

/** The `failed` sites reply for the end or link `from` → `to` of `packageName`. */
export const failedSitesOf = (packageName: string, from: ModuleEnd, to: ModuleEnd | null): GraphModuleSitesMessage => {
  const failed: GraphModuleSitesMessage = { type: 'moduleSites', packageName, from, to, result: FAILED_SITES };

  return failed;
};

/** `packageName` and the graph state that lists it; `undefined` when the state is not a graph or does not list it. */
export const listedPackageOf = (state: GraphState, packageName: string): ListedPackage | undefined => {
  if (state.kind !== 'graph') return undefined;

  const pkg = packagesByName(state).get(packageName);

  if (pkg === undefined) return undefined;

  const listed: ListedPackage = { state, pkg };

  return listed;
};

/** `failed` for a failed scan or an answer that throws (reported); else the scan's modules. */
export const modulesResultOf = (outcome: AnsweredOutcome, ctx: ModulesContext, report: (error: unknown) => void): ModulesResult => {
  if (outcome.kind === 'failed') return FAILED_MODULES;

  try {
    return answerModules(outcome.scan, ctx);
  } catch (error: unknown) {
    report(error);

    return FAILED_MODULES;
  }
};

/** `failed` for a failed scan or an answer that throws (reported); else the scan's sites for `query`. */
export const sitesResultOf = (
  outcome: AnsweredOutcome,
  ctx: ModulesContext,
  query: ModuleSitesQuery,
  report: (error: unknown) => void
): ModuleSitesResult => {
  if (outcome.kind === 'failed') return FAILED_SITES;

  try {
    return answerModuleSites(outcome.scan, ctx, query);
  } catch (error: unknown) {
    report(error);

    return FAILED_SITES;
  }
};

/** Posts `message`; a post that throws is reported, never rethrown. */
export const postModules = (
  gate: ScanGate,
  message: GraphPackageModulesMessage | GraphModuleSitesMessage,
  report: (error: unknown) => void
): void => {
  try {
    gate.ports.post(message);
  } catch (error: unknown) {
    report(error);
  }
};
