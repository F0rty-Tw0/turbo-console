const wordsOf = (text: string): ReadonlySet<string> => new Set(text.trim().split(/\s+/));

/**
 * Spec runner-chains, "Behavior" step 3: the commands each manager owns, so `pnpm X` follows a script `X` only when `X` is not
 * one of them. They target current majors (pnpm 11+, yarn classic and berry, bun main as of 2026-10); the model has no manager
 * version, so older majors may differ (pnpm 10 runs its built-in `deploy`/`rebuild`/`setup` even when a script has that name;
 * here they follow the script, so `clean purge setup deploy rebuild rb` are not listed). `test`/`start` fall back to `run`.
 * Sources: pnpm `cmd/index.ts` + `main.ts` `redirectToOverridingScript` (v11), yarn `src/cli/commands/index.js` +
 * yarnpkg.com/cli, bun `src/runtime/cli/mod.rs`.
 */
const PNPM_BUILTINS: ReadonlySet<string> = wordsOf(
  `
  install i add remove rm uninstall un update up upgrade publish pack link ln unlink exec dlx create init store why outdated
  list ls ll audit prune patch patch-commit patch-remove config c get set import fetch env ci dedupe bin root cache doctor
  restart licenses install-test it self-update approve-builds ignored-builds cat-file cat-index find-hash completion help
  recursive access bugs change deprecate dist-tag docs owner runtime pkg lane login logout pack-app peers ping prefix team
  stage unpublish repo sbom set-script search star stars undeprecate unstar version view whoami with
  `
);

/** Yarn classic and berry commands; see `PNPM_BUILTINS` for the version note and sources. */
const YARN_BUILTINS: ReadonlySet<string> = wordsOf(
  `
  install add remove up upgrade upgrade-interactive publish pack link unlink init create dlx exec info why workspaces
  workspace config cache npm set plugin constraints version access audit autoclean bin check generate-lock-entry global help
  import licenses list login logout node outdated owner policies tag team unplug versions dedupe explain patch patch-commit
  rebuild search stage
  `
);

/** Bun commands; `check`/`lint`/`fmt` prefer a script, so they are not listed. See `PNPM_BUILTINS` for the version note. */
const BUN_BUILTINS: ReadonlySet<string> = wordsOf(
  `
  test build install i add a remove rm r uninstall update up upgrade x create pm link unlink publish init outdated c ci patch
  patch-commit repl exec audit info why help whoami list dedupe prune discord completions deploy cloud config use auth login
  logout
  `
);

/** Turbo commands that `turbo X` runs instead of a task `X`; see `PNPM_BUILTINS` for the version note. */
export const TURBO_BUILTINS: ReadonlySet<string> = wordsOf(
  `
  prune ls info link unlink login logout gen generate daemon query telemetry boundaries scan bin docs devtools watch
  `
);

/** Spec D3: a delegating segment holding one of these runs other packages' scripts, so it is not followed. */
export const CROSS_PACKAGE_FLAGS: ReadonlySet<string> = wordsOf(
  `
  --filter -F -w --workspace --workspaces -ws -r --recursive -C --dir --prefix --cwd
  `
);

/** The one-letter D3 flags that may be glued to their value, as in `-Fweb`. */
export const GLUED_FLAGS: string[] = ['-F', '-C', '-w'];

/** The npm lifecycle shorthands: `npm test` runs the script `test`. */
export const NPM_LIFECYCLE: string[] = ['test', 'start', 'stop', 'restart'];

/** The managers whose `<pm> X` shorthand runs a script `X`, each with the commands it owns. npm has no shorthand. */
export const BUILTINS_BY_MANAGER: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['pnpm', PNPM_BUILTINS],
  ['yarn', YARN_BUILTINS],
  ['bun', BUN_BUILTINS]
]);
