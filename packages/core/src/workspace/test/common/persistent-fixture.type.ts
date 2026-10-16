/** A package of the persistent probe fixture: `turbo` is its `turbo.json` text, `null` for a package with no config. */
export type PersistentFixturePackage = {
  readonly dir: string;
  readonly name: string;
  readonly scripts: string[];
  readonly turbo: string | null;
};
