import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { backdateTree } from '../../../cache/test/utils/backdate.spec.util.ts';
import { AGE_MS } from '../../../cache/test/utils/root-fixture.spec.util.ts';
import type { PersistentFixturePackage, PersistentVariant } from '../common/persistent-fixture.type.ts';
import { P1D_ROOT_TURBO_STUB, P1_ROOT_TURBO_STUB, PERSISTENT_PACKAGES_STUB } from '../stubs/persistent-fixture.stub.ts';

const ROOT_MANIFEST = '{"name":"persistent-fixture","packageManager":"pnpm@10.0.0","private":true}';

const WORKSPACE_YAML = 'packages: ["pkgs/*"]\n';

const NOOP_SCRIPT = 'node -e 0';

const scriptEntry = (name: string): [string, string] => [name, NOOP_SCRIPT];

const writePackage = async (root: string, pkg: PersistentFixturePackage): Promise<void> => {
  const dir = join(root, pkg.dir);
  const scripts = Object.fromEntries(pkg.scripts.map(scriptEntry));
  const manifest = JSON.stringify({ name: pkg.name, scripts });

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'package.json'), manifest);

  if (pkg.turbo !== null) await writeFile(join(dir, 'turbo.json'), pkg.turbo);
};

const rootTurboOf = (variant: PersistentVariant): string => (variant === 'p1' ? P1_ROOT_TURBO_STUB : P1D_ROOT_TURBO_STUB);

/**
 * A new pnpm workspace under `parent` with spec §5.2's probe packages and configs, every file last written `AGE_MS`
 * ago. Written inline, not copied from the probe dirs: CI has none of them.
 */
export const writePersistentFixture = async (parent: string, variant: PersistentVariant): Promise<string> => {
  const root = await mkdtemp(join(parent, 'persistent-'));
  const writeOne = async (pkg: PersistentFixturePackage): Promise<void> => writePackage(root, pkg);

  await writeFile(join(root, 'package.json'), ROOT_MANIFEST);
  await writeFile(join(root, 'pnpm-workspace.yaml'), WORKSPACE_YAML);
  await writeFile(join(root, 'turbo.json'), rootTurboOf(variant));
  await Promise.all(PERSISTENT_PACKAGES_STUB.map(writeOne));
  await backdateTree(root, AGE_MS);

  return root;
};
