import type { ModuleSitesQuery } from '@turbo-console/core';
import type {
  GraphModuleSitesMessage,
  GraphPackage,
  GraphPackageModulesMessage,
  GraphReady,
  ModuleEnd
} from '@turbo-console/webview-ui';

import { textOf } from './graph-read.ts';
import { failedModulesOf, failedSitesOf, listedPackageOf, modulesResultOf, postModules, sitesResultOf } from './modules-reply.ts';
import type { ExplainContext } from '../common/graph.type.ts';
import type { AnsweredOutcome, ModuleAskPort, ModulesContext } from '../common/import-match.type.ts';
import { manifestFilesOf } from '../utils/graph-package.util.ts';
import { scanDirsOf } from '../utils/scan-dirs.util.ts';

/** A module ask its run answered: the scan's outcome and what the answer needs besides it. */
type SettledAsk = {
  readonly outcome: AnsweredOutcome;
  readonly ctx: ModulesContext;
};

type ModulesReply = GraphPackageModulesMessage | GraphModuleSitesMessage;

const replyOf = (port: ModuleAskPort, message: ModulesReply): void => {
  const canPost = port.gate.canPost();

  if (canPost) postModules(port.gate, message, port.report);
};

/** Posts `message` only when the graph still lists its package. */
const replyListedOf = (port: ModuleAskPort, message: ModulesReply): void => {
  const relisted = listedPackageOf(port.gate.state(), message.packageName);

  if (relisted !== undefined) replyOf(port, message);
};

/**
 * Joins the run of `pkg`'s dir, or starts it, under `key`, reads `pkg`'s manifest and waits for the scan; `undefined` once
 * disposed, when the run in flight is already asked for `key`, or when the scan was aborted.
 */
const settledAskOf = async (port: ModuleAskPort, state: GraphReady, pkg: GraphPackage, key: string): Promise<SettledAsk | undefined> => {
  const isDisposed = port.isDisposed();

  if (isDisposed) return undefined;

  const { root, ports, canPost } = port.gate;
  const dirs = scanDirsOf(root, state.packages, pkg, pkg);
  const run = port.runFor(dirs);
  const isAsked = run.asked.has(key);

  if (isAsked) return undefined;

  run.asked.add(key);

  const context: ExplainContext = { state, root, ports, canPost };
  const { absolute } = manifestFilesOf(root, pkg);
  const manifestText = await textOf(context, absolute).catch(() => null);
  const outcome = await run.outcome;

  if (outcome.kind === 'aborted') return undefined;

  const ctx: ModulesContext = { root, packageName: pkg.name, dir: dirs.sourceDir, packages: state.packages, manifestText };
  const settled: SettledAsk = { outcome, ctx };

  return settled;
};

/**
 * Posts one `packageModules` for `packageName` (spec §6.1, §6.2): `failed` at once when the graph does not list it; else
 * the reply once the scan of its dir settled, held back when the scan was aborted or the package is no longer listed.
 */
export const askModules = async (port: ModuleAskPort, packageName: string): Promise<void> => {
  const listed = listedPackageOf(port.gate.state(), packageName);

  if (listed === undefined) {
    replyOf(port, failedModulesOf(packageName));

    return;
  }

  const key = JSON.stringify([packageName]);
  const settled = await settledAskOf(port, listed.state, listed.pkg, key);

  if (settled === undefined) return;

  const result = modulesResultOf(settled.outcome, settled.ctx, port.report);
  const message: GraphPackageModulesMessage = { type: 'packageModules', packageName, result };

  replyListedOf(port, message);
};

/**
 * Posts one `moduleSites` for the end or link `from` → `to` of `packageName` (spec §5.4, §8): `failed` at once when the
 * graph does not list it; else the reply once the scan of its dir settled (`failed` when it failed), joining a modules or
 * sites run of the same package, held back when the scan was aborted or the package is no longer listed.
 */
export const askModuleSites = async (port: ModuleAskPort, packageName: string, from: ModuleEnd, to: ModuleEnd | null): Promise<void> => {
  const listed = listedPackageOf(port.gate.state(), packageName);

  if (listed === undefined) {
    replyOf(port, failedSitesOf(packageName, from, to));

    return;
  }

  const key = JSON.stringify(['sites', packageName, from, to]);
  const settled = await settledAskOf(port, listed.state, listed.pkg, key);

  if (settled === undefined) return;

  const query: ModuleSitesQuery = { from, to };
  const result = sitesResultOf(settled.outcome, settled.ctx, query, port.report);
  const message: GraphModuleSitesMessage = { type: 'moduleSites', packageName, from, to, result };

  replyListedOf(port, message);
};
