import { IMPORT_CACHE_MAX } from '../common/import-scan.const.ts';
import type { CachedFile, ImportFileStore } from '../common/import-scan.type.ts';

const NO_FILES: ReadonlyMap<string, CachedFile> = new Map();

/** Lex results per scanned package dir, keyed by posix file relative to that dir (D9). One per graph session. */
export class ImportFileCache implements ImportFileStore {
  readonly #maps = new Map<string, ReadonlyMap<string, CachedFile>>();

  public filesOf(dir: string): ReadonlyMap<string, CachedFile> {
    return this.#maps.get(dir) ?? NO_FILES;
  }

  public swap(dir: string, files: ReadonlyMap<string, CachedFile>): void {
    const own = this.filesOf(dir).size;
    const others = this.#size() - own;
    const isOver = others + files.size > IMPORT_CACHE_MAX;

    if (isOver) this.#maps.clear();

    this.#maps.set(dir, files);
  }

  #size(): number {
    let total = 0;

    for (const map of this.#maps.values()) total += map.size;

    return total;
  }
}
