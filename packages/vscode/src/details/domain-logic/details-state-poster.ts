import type { DetailsState, HostMessage } from '@turbo-console/webview-ui';

import type { RunEntry } from '../../run/common/run.type.ts';
import type { PosterDeps } from '../common/details.type.ts';
import { currentTaskOf } from '../utils/current-task.util.ts';
import { detailsInputOf, toDetailsState } from '../utils/details-state.util.ts';
import { liveRunViewOf } from '../utils/run-view.util.ts';

/**
 * Builds the states of one panel and posts them. A run change posts a `runState`, except when scripts are hidden and a
 * script of this package starts or ends: its live card appears or goes (spec 1c-b §4.7), so the whole `state` goes. The
 * rule keeps `live`, the ids of this package's runs that were running as last seen, which `start` seeds; it is kept up to
 * date whatever the toggle says and while nothing can be posted.
 */
export class DetailsStatePoster {
  private readonly deps: PosterDeps;
  private readonly live = new Set<string>();

  public constructor(deps: PosterDeps) {
    this.deps = deps;
  }

  /** Takes this package's runs already live; the set `runningIds` returns may be cached, so it is copied, never kept. */
  public seed(): void {
    const { key, runs } = this.deps;

    this.live.clear();

    for (const id of runs.runningIds(key.root)) {
      const isOwn = runs.get(key.root, id)?.packageName === key.packageName;

      if (isOwn) this.live.add(id);
    }
  }

  public state(): DetailsState | null {
    const { key, roots, runs, ports, gate, dryRun } = this.deps;
    const entry = roots.get(key.root);
    const isStarted = gate.isStarted();

    if (!isStarted || entry === undefined) return null;

    const base = { ...key, state: entry.state, dryRun: dryRun(), runs: runs.get, scriptsShown: ports.scriptsShown() };

    return toDetailsState(detailsInputOf(base, ports.now()));
  }

  public publish(): void {
    const state = this.state();
    const canPost = this.deps.gate.canPost();

    if (!canPost || state === null) return;

    const message: HostMessage = { type: 'state', state };

    this.deps.ports.post(message);
  }

  public runChanged(entry: RunEntry): void {
    const { key, roots, ports, gate } = this.deps;
    const isOwn = entry.root === key.root && entry.packageName === key.packageName;

    if (!isOwn) return;

    const isCardChange = this.isLiveCardChange(entry);
    const canPost = gate.canPost();

    if (!canPost) return;

    if (isCardChange) {
      this.publish();

      return;
    }

    const run = liveRunViewOf(roots.get(entry.root)?.state.model ?? null, entry, ports.now());
    const message: HostMessage = { type: 'runState', taskId: entry.taskId, run };

    ports.post(message);
  }

  /** Whether the live card of a script, judged by its current model node, appeared or went while scripts are hidden. */
  private isLiveCardChange(entry: RunEntry): boolean {
    const { roots, ports } = this.deps;
    const isMember = entry.state === 'running';
    const wasMember = this.live.has(entry.taskId);

    if (isMember) this.live.add(entry.taskId);
    else this.live.delete(entry.taskId);

    const task = currentTaskOf(roots.get(entry.root)?.state.model ?? null, entry.packageName, entry.taskId);
    const isScript = task !== undefined && !task.isTurboTask;

    return isScript && !ports.scriptsShown() && isMember !== wasMember;
  }
}
