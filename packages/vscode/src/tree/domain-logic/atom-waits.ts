import type { AtomGroup } from '@turbo-console/core';

/**
 * The packages of each root whose children request found no turbo binary. A reload publishes the cached model without
 * its binary, then the same model with it; the root's next model change retries them, so an expansion VS Code restores
 * after a reload still loads (spec 3.5).
 */
export class AtomWaits {
  private readonly byRoot = new Map<string, Set<string>>();

  public add(root: string, packageName: string): void {
    const packages = this.byRoot.get(root) ?? new Set<string>();

    packages.add(packageName);
    this.byRoot.set(root, packages);
  }

  /** Forgets every waiting package of `root` and returns the ones that still have a group in `groups`. */
  public takeOf(root: string, groups: AtomGroup[]): string[] {
    const waiting = this.byRoot.get(root) ?? new Set<string>();
    const hasGroups = (packageName: string): boolean => groups.some((group) => group.packageName === packageName);
    const packages = [...waiting];
    const retried = packages.filter(hasGroups);

    this.byRoot.delete(root);

    return retried;
  }

  /** A removed root forgets its waiting packages: a root added again at the same path waits for a new children request. */
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
