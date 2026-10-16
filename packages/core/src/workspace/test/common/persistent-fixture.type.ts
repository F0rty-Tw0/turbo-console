/** A package of the persistent probe fixture: `turbo` is its `turbo.json` text, `null` for a package with no config. */
export type PersistentFixturePackage = {
  readonly dir: string;
  readonly name: string;
  readonly scripts: string[];
  readonly turbo: string | null;
};

/** `p1`: the P1, P1b and P1c root config (spec §5.2); `p1d`: the same plus a root `@p/b#dev` key. */
export type PersistentVariant = 'p1' | 'p1d';
