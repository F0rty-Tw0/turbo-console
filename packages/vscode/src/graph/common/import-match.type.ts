/** One edge A → B as the matcher sees it: `names` = B's name, then A's `package.json` keys that alias B (raw, not cut); `targetDir` = B's absolute dir, `null` when B is the root package (D5: relative and alias rules skipped); `sourceDir` = A's absolute dir. */
export type ImportEdge = {
  readonly names: string[];
  readonly targetDir: string | null;
  readonly sourceDir: string;
};
