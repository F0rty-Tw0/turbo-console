import type { TurboBinarySource } from './turbo-binary.type.ts';

/**
 * A resolved, version-checked turbo binary bound to its workspace `root`. Only `resolveTurbo` creates one: `#brand`
 * keeps any object literal from satisfying the type, and the package exports the class type-only. The brand is
 * compile-time only; readers never check it at runtime.
 */
export class TurboBinary {
  readonly #brand = true;
  public readonly root: string;
  public readonly path: string;
  public readonly version: string;
  public readonly source: TurboBinarySource;

  public constructor(root: string, path: string, version: string, source: TurboBinarySource) {
    void this.#brand;
    this.root = root;
    this.path = path;
    this.version = version;
    this.source = source;
  }
}
