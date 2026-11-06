import { ImportFileCache } from '@turbo-console/core';
import type { ImportScanInput, PackageImportScan } from '@turbo-console/core';
import type { EdgeImportsResult, GraphEdgeImportsMessage } from '@turbo-console/webview-ui';

import { textOf } from './graph-read.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { ExplainContext, ScanGate } from '../common/graph.type.ts';
import type { ImportEdge, ScanDirs } from '../common/import-match.type.ts';
import { hasEdge, manifestFilesOf, packagesByName } from '../utils/graph-package.util.ts';
import { answerImports } from '../utils/import-answer.util.ts';
import { aliasKeysOf } from '../utils/manifest-entries.util.ts';
import { scanDirsOf } from '../utils/scan-dirs.util.ts';

type ScannedOutcome = { readonly kind: 'scan'; readonly scan: PackageImportScan };

type FailedOutcome = { readonly kind: 'failed' };

type AbortedOutcome = { readonly kind: 'aborted' };

type AnsweredOutcome = ScannedOutcome | FailedOutcome;

type ScanOutcome = AnsweredOutcome | AbortedOutcome;

type ScanRun = {
  readonly dir: string;
  readonly controller: AbortController;
  readonly outcome: Promise<ScanOutcome>;
};

const ABORTED: AbortedOutcome = { kind: 'aborted' };
const FAILED_SCAN: FailedOutcome = { kind: 'failed' };
const FAILED_REPLY: EdgeImportsResult = { kind: 'failed' };

/** The target's name, then the source's raw keys that alias it; just the target's name when the source's `package.json` is unreadable. */
const namesOf = (target: string, text: string | null): string[] => {
  if (text === null) return [target];

  const aliases = aliasKeysOf(text, target);

  return [target, ...aliases];
};

/**
 * The import scans of one panel (spec D10 T2): one scan in flight; an ask for the package being scanned joins it, an ask for
 * another package aborts it; an aborted scan posts nothing. One `ImportFileCache` for the panel's life (D9).
 */
export class ImportScans {
  private readonly gate: ScanGate;
  private readonly cache = new ImportFileCache();
  private running: ScanRun | undefined;
  private isDisposed = false;

  public constructor(gate: ScanGate) {
    this.gate = gate;
  }

  /** `false` at once when the graph does not list the edge; else `true` once the scan settled and the reply was posted or held back. */
  public async ask(source: string, target: string): Promise<boolean> {
    const { root, ports, canPost } = this.gate;
    const state = this.gate.state();

    if (state.kind !== 'graph') return false;

    const byName = packagesByName(state);
    const from = byName.get(source);
    const to = byName.get(target);
    const isListed = hasEdge(state.edges, source, target);

    if (from === undefined || to === undefined || !isListed) return false;

    if (this.isDisposed) return true;

    const dirs = scanDirsOf(root, state.packages, from, to);
    const run = this.runFor(dirs);
    const context: ExplainContext = { state, root, ports, canPost };
    const { absolute } = manifestFilesOf(root, from);
    const text = await textOf(context, absolute).catch(() => null);
    const names = namesOf(target, text);
    const edge: ImportEdge = { names, targetDir: dirs.targetDir, sourceDir: dirs.sourceDir };
    const outcome = await run.outcome;

    if (outcome.kind === 'aborted') return true;

    const result = this.resultOf(outcome, edge);

    this.reply(source, target, result);

    return true;
  }

  public dispose(): void {
    this.isDisposed = true;
    this.running?.controller.abort();
  }

  private runFor(dirs: ScanDirs): ScanRun {
    const { running } = this;

    if (running?.dir === dirs.sourceDir) return running;

    return this.start(dirs);
  }

  private start(dirs: ScanDirs): ScanRun {
    this.running?.controller.abort();

    const controller = new AbortController();
    const outcome = this.settle(dirs, controller);
    const run: ScanRun = { dir: dirs.sourceDir, controller, outcome };
    const clear = (): void => {
      if (this.running === run) this.running = undefined;
    };

    this.running = run;
    void outcome.then(clear);

    return run;
  }

  private async settle(dirs: ScanDirs, controller: AbortController): Promise<ScanOutcome> {
    const { root } = this.gate;
    const { signal } = controller;
    const input: ImportScanInput = { dir: dirs.sourceDir, root, skipDirs: dirs.skipDirs, cache: this.cache, signal };
    const outcome = await this.scanOutcomeOf(input);

    return signal.aborted ? ABORTED : outcome;
  }

  private async scanOutcomeOf(input: ImportScanInput): Promise<ScanOutcome> {
    try {
      const scan = await this.gate.ports.scanImports(input);
      const done: ScannedOutcome = { kind: 'scan', scan };

      return done;
    } catch (error: unknown) {
      if (!input.signal.aborted) {
        this.report(error);
      }

      return FAILED_SCAN;
    }
  }

  private resultOf(outcome: AnsweredOutcome, edge: ImportEdge): EdgeImportsResult {
    if (outcome.kind === 'failed') return FAILED_REPLY;

    try {
      return answerImports(outcome.scan, edge);
    } catch (error: unknown) {
      this.report(error);

      return FAILED_REPLY;
    }
  }

  private reply(source: string, target: string, result: EdgeImportsResult): void {
    const state = this.gate.state();

    if (state.kind !== 'graph') return;

    const isListed = hasEdge(state.edges, source, target);
    const canPost = this.gate.canPost();

    if (!isListed || !canPost) return;

    const message: GraphEdgeImportsMessage = { type: 'edgeImports', source, target, result };

    try {
      this.gate.ports.post(message);
    } catch (error: unknown) {
      this.report(error);
    }
  }

  /** A log that throws is dropped: `ask` and `settle` never reject, and a failing log must not undo that. */
  private report(error: unknown): void {
    try {
      this.gate.ports.log(logTextOf(error));
    } catch {
      return;
    }
  }
}
