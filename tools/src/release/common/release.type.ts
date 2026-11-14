/** One GitHub Actions run of the CI workflow, as `gh run list --json conclusion` reports it. */
export type CiRun = {
  readonly conclusion: string;
};

/** What the release guard checks before a tag may publish: the tag, the manifest version, the branch and the CI runs. */
export type GuardInput = {
  readonly tag: string;
  readonly version: string;
  readonly isAncestor: boolean;
  readonly ciRuns: CiRun[];
};
