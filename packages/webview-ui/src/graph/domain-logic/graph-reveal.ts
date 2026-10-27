import type { DrawnGraph } from '../common/graph-page.type.ts';
import type { RevealDeps } from '../common/graph-reveal.type.ts';
import { REVEAL_ZOOM, REVEAL_ZOOM_MIN } from '../common/graph.const.ts';
import { folderOf } from '../utils/folder-group.util.ts';
import { revealFiltersOf } from '../utils/reveal-filters.util.ts';

/**
 * The host's Show package: leaves task mode, clears the filters that hide the package and opens its collapsed folder,
 * then selects it, zoomed in to a readable size first. The name waits, unchecked and latest first, until the package
 * graph is placed and no layout of it is in flight, so the selection lands after the layouts' trailing fit; a name the
 * graph then lacks is dropped.
 */
export class PackageReveal {
  private readonly deps: RevealDeps;
  private pending: string | null = null;

  public constructor(deps: RevealDeps) {
    this.deps = deps;
  }

  /** Holds `name` in place of any held before; task mode is left first, and the package graph it shows places later. */
  public request(name: string, at: number): void {
    const { tasks } = this.deps;
    const isTaskMode = tasks.isActive();

    this.pending = name;

    if (isTaskMode) {
      tasks.leave(at);

      return;
    }

    this.apply();
  }

  /** A package layout was placed: a held name applies once the place's trailing fit has run. */
  public placed(): void {
    if (this.pending === null) return;

    queueMicrotask((): void => this.apply());
  }

  private apply(): void {
    const { pending, deps } = this;
    const drawn = deps.drawn();
    const isPlacing = deps.layouts.isPlacing();

    if (pending === null || drawn === null || isPlacing) return;

    const isKnown = drawn.packages.includes(pending);

    if (!isKnown) {
      this.pending = null;

      return;
    }

    this.unhide(pending);
    this.openFolder(drawn, pending);

    const isLayingOut = deps.layouts.isPlacing();

    if (!isLayingOut) this.finish(pending);
  }

  /** Filters that already show the package are not edited, as an edit of the same filters still repaints the panel. */
  private unhide(name: string): void {
    const { controls } = this.deps.filtering;
    const { mounted, applied } = controls;

    if (mounted === null) return;

    const next = revealFiltersOf(applied, mounted.graph, name);

    if (next !== applied) controls.edit(mounted, next);
  }

  /** Grouped by folder, the package's collapsed folder expands; a flat page keeps its collapsed set as it is. */
  private openFolder(drawn: DrawnGraph, name: string): void {
    const { layouts, filtering } = this.deps;
    const mode = layouts.mode();
    const isGrouped = mode === 'folders';
    const info = drawn.infos.find((pkg): boolean => pkg.name === name);

    if (!isGrouped || info === undefined) return;

    const folder = folderOf(info.path);
    const isCollapsed = filtering.folders.collapsed().has(folder);

    if (isCollapsed) filtering.folders.expand([folder]);
  }

  /** The select centres the package at the zoom set here, then keeps it clear of the details overlay. */
  private finish(name: string): void {
    const { view, inspection } = this.deps;
    const { zoom, pan } = view.viewport();

    this.pending = null;

    if (zoom < REVEAL_ZOOM_MIN) view.setViewport(REVEAL_ZOOM, pan);

    inspection.select(name);
  }
}
