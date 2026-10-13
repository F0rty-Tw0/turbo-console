/** Per-command spawn budgets (ms), passed by each reader to `runTurbo` as `timeoutMs`. */
export const TURBO_BUDGET_MS = Object.freeze({ query: 30_000, version: 5000, dryRun: 60_000 });
