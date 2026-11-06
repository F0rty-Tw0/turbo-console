/** One edge A → B as the matcher sees it: `names` = B's name, then A's `package.json` keys that alias B (raw, not cut); `targetDir` = B's absolute dir, `null` when B is the root package (D5: relative and alias rules skipped); `sourceDir` = A's absolute dir. */
export type ImportEdge = {
  readonly names: string[];
  readonly targetDir: string | null;
  readonly sourceDir: string;
};

/** The dirs one scan of A for edge A → B needs: A's, B's (`null` for the root package, D5) and the package dirs the walk of A never enters (D7). */
export type ScanDirs = {
  readonly sourceDir: string;
  readonly targetDir: string | null;
  readonly skipDirs: ReadonlySet<string>;
};
