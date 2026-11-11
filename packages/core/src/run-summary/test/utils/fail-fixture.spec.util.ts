import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** A task whose script exits 3. */
export const FAILING_NAME = 'fail-3';

/** A task that depends on `FAILING_NAME`, so it never runs. */
export const DEPENDENT_NAME = 'after-fail';

export const SCRIPTS_ANCHOR = '"scripts": {';

export const TASKS_ANCHOR = '"tasks": {';

/** Inserts `entry` as the first member of the object that opens with `anchor` in `file`; throws when `anchor` is absent. */
export const insertMember = async (file: string, anchor: string, entry: string): Promise<void> => {
  const text = await readFile(file, 'utf8');
  const hasAnchor = text.includes(anchor);

  if (!hasAnchor) throw new Error(`no ${anchor} in ${file}`);

  await writeFile(file, text.replace(anchor, `${anchor}\n${entry},`));
};

/** Adds `FAILING_NAME` and `DEPENDENT_NAME` to the root `turbo.json` of `dir` and to `<dir>/<packagePath>/package.json`. */
export const addFailTasks = async (dir: string, packagePath: string): Promise<void> => {
  const turboJson = join(dir, 'turbo.json');
  const packageJson = join(dir, packagePath, 'package.json');

  await insertMember(turboJson, TASKS_ANCHOR, `    "${FAILING_NAME}": {}`);
  await insertMember(turboJson, TASKS_ANCHOR, `    "${DEPENDENT_NAME}": { "dependsOn": ["${FAILING_NAME}"] }`);
  await insertMember(packageJson, SCRIPTS_ANCHOR, `    "${FAILING_NAME}": "node -e \\"process.exit(3)\\""`);
  await insertMember(packageJson, SCRIPTS_ANCHOR, `    "${DEPENDENT_NAME}": "node -e 0"`);
};
