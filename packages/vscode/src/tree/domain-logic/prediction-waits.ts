import type { WorkspaceModel } from '@turbo-console/core';

import { hasPackageNamed } from '../utils/package-named.util.ts';

/**
 * The packages of each root whose cache prediction found no turbo binary. The root's next published model takes them
 * back and asks again, so a prediction wanted before the binary was known still arrives.
 */
export class PredictionWaits {
  private readonly byRoot = new Map<string, Set<string>>();

  public add(root: string, packageName: string): void {
    const packages = this.byRoot.get(root) ?? new Set<string>();

    packages.add(packageName);
    this.byRoot.set(root, packages);
  }

  /** Forgets every waiting package of `root` and returns the ones that are still in `model`. */
  public takeOf(root: string, model: WorkspaceModel | null): string[] {
    const waiting = this.byRoot.get(root) ?? new Set<string>();
    const inModel = (packageName: string): boolean => hasPackageNamed(model, packageName);
    const packages = [...waiting];
    const retried = packages.filter(inModel);

    this.byRoot.delete(root);

    return retried;
  }

  /** A removed root forgets its waiting packages: a root added again at the same path waits for a new request. */
  public keep(kept: ReadonlySet<string>): void {
    for (const root of this.byRoot.keys()) {
      const isKept = kept.has(root);

      if (!isKept) this.byRoot.delete(root);
    }
  }

  public clear(): void {
    this.byRoot.clear();
  }
}
