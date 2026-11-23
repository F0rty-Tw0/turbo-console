import type { GraphPackage, GraphPackageModulesMessage, GraphReady, GraphState, ModulesResult } from '@turbo-console/webview-ui';

import type { ScanGate } from '../common/graph.type.ts';
import type { AnsweredOutcome, ModulesContext } from '../common/import-match.type.ts';
import { packagesByName } from '../utils/graph-package.util.ts';
import { answerModules } from '../utils/modules-answer.util.ts';

/** A package the graph lists now, with the graph that lists it. */
type ListedPackage = {
  readonly state: GraphReady;
  readonly pkg: GraphPackage;
};

const FAILED_MODULES: ModulesResult = { kind: 'failed' };

/** The `failed` reply for `packageName`. */
export const failedModulesOf = (packageName: string): GraphPackageModulesMessage => {
  const failed: GraphPackageModulesMessage = { type: 'packageModules', packageName, result: FAILED_MODULES };

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

/** Posts `message`; a post that throws is reported, never rethrown. */
export const postModules = (gate: ScanGate, message: GraphPackageModulesMessage, report: (error: unknown) => void): void => {
  try {
    gate.ports.post(message);
  } catch (error: unknown) {
    report(error);
  }
};
