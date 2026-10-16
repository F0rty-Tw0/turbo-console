import type { PersistentFixturePackage } from '../common/persistent-fixture.type.ts';

/** `g#lint` sits before the bare `lint` on purpose: a `<pkg>#<task>` key wins whatever its place. */
const P1_ROOT_ENTRIES = [
  '"g#lint":{"outputs":["x/**"]}',
  '"lint":{"persistent":true}',
  '"build":{}',
  '"dev":{"persistent":true,"cache":false}',
  '"serve":{"persistent":true}',
  '"watch":{}',
  '"d#watch":{"persistent":true}',
  '"d#serve":{"outputs":["out/**"]}',
  '"e#serve":{"outputs":["o/**"]}'
];

const P1D_ROOT_ENTRIES = P1_ROOT_ENTRIES.toSpliced(4, 0, '"@p/b#dev":{"persistent":false,"outputs":["rootb/**"]}');

/** Spec §5.2 probes P1, P1b and P1c (turbo 2.11.7): the root `turbo.json` text. */
export const P1_ROOT_TURBO_STUB: string = `{"tasks":{${P1_ROOT_ENTRIES.join(',')}}}`;

/** Spec §5.2 probe P1d: P1's root plus a root `@p/b#dev` key after the bare `dev`. */
export const P1D_ROOT_TURBO_STUB: string = `{"tasks":{${P1D_ROOT_ENTRIES.join(',')}}}`;

const SERVE_SCRIPTS = ['build', 'dev', 'serve', 'watch'];

const WEB_SCRIPTS = ['start', 'zap', 'lint', 'dev', 'keep'];

const PAIR_SCRIPTS = ['start', 'z2', 'z3', 'lint'];

const fixturePackage = (dir: string, name: string, scripts: string[], turbo: string | null): PersistentFixturePackage => {
  const pkg: PersistentFixturePackage = { dir: `pkgs/${dir}`, name, scripts, turbo };

  return pkg;
};

/** The probe packages, their scripts and their `turbo.json` texts, as in `~/.cache/tc-probe-persistent3b`. */
export const PERSISTENT_PACKAGES_STUB: PersistentFixturePackage[] = [
  fixturePackage('a', '@p/a', SERVE_SCRIPTS, '{"extends":["//"],"tasks":{"dev":{"persistent":false}}}'),
  fixturePackage(
    'b',
    '@p/b',
    SERVE_SCRIPTS,
    '{"extends":["//"],"tasks":{"dev":{"outputs":["dist/**"]},"serve":{"persistent":false},"watch":{"persistent":true}}}'
  ),
  fixturePackage('c', '@p/c', SERVE_SCRIPTS, '{"extends":["//","@p/b"],"tasks":{"build":{"outputs":[]}}}'),
  fixturePackage('d', 'd', SERVE_SCRIPTS, null),
  fixturePackage('e', 'e', ['dev', 'serve'], '{"extends":["//"],"tasks":{"serve":{"cache":false}}}'),
  fixturePackage('f', '@p/f', ['dev', 'lint'], '{"extends":["//"],"tasks":{"dev":{"extends":false,"outputs":[]}}}'),
  fixturePackage('g', 'g', ['lint', 'dev'], null),
  fixturePackage('gp', 'gp', [], '{"extends":["//"],"tasks":{"start":{"persistent":true},"zap":{},"keep":{"persistent":true}}}'),
  fixturePackage(
    'base',
    'base',
    [],
    '{"extends":["//","gp"],"tasks":{"start":{},"zap":{"extends":false},"lint":{"extends":false},"dev":{"extends":false,"outputs":[]},"keep":{"extends":false,"cache":false}}}'
  ),
  fixturePackage('base2', 'base2', [], '{"extends":["//","gp"],"tasks":{"start":{"persistent":false},"zap":{"extends":false}}}'),
  fixturePackage('q', 'q', [], '{"extends":["//"],"tasks":{"z2":{},"z3":{}}}'),
  fixturePackage(
    'p1',
    'p1',
    [],
    '{"extends":["//","q"],"tasks":{"start":{"persistent":true},"z2":{"persistent":true},"z3":{"extends":false},"lint":{"outputs":["p1/**"]}}}'
  ),
  fixturePackage(
    'p2',
    'p2',
    [],
    '{"extends":["//","q"],"tasks":{"start":{"persistent":false},"z2":{"extends":false},"z3":{"persistent":true},"lint":{"cache":false}}}'
  ),
  fixturePackage('web1', 'web1', WEB_SCRIPTS, '{"extends":["//","base"],"tasks":{}}'),
  fixturePackage('web2', 'web2', WEB_SCRIPTS, '{"extends":["//","base2"],"tasks":{}}'),
  fixturePackage('web3', 'web3', WEB_SCRIPTS, '{"extends":["//","gp","base2"],"tasks":{}}'),
  fixturePackage('web4', 'web4', WEB_SCRIPTS, '{"extends":["//","base2","gp"],"tasks":{}}'),
  fixturePackage('web5', 'web5', WEB_SCRIPTS, '{"extends":["//","base"],"tasks":{"zap":{},"start":{"cache":false}}}'),
  fixturePackage('web6', 'web6', WEB_SCRIPTS, '{"extends":["//","gp"],"tasks":{"start":{"extends":false,"cache":false}}}'),
  fixturePackage('web7', 'web7', PAIR_SCRIPTS, '{"extends":["//","p1","p2"],"tasks":{}}'),
  fixturePackage('web8', 'web8', PAIR_SCRIPTS, '{"extends":["//","p2","p1"],"tasks":{}}'),
  fixturePackage('web9', 'web9', ['dev'], '{"extends":["//","@p/a","@p/b"],"tasks":{}}')
];
