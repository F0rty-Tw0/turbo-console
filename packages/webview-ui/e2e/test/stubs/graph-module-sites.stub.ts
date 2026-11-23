import type {
  GraphScanModuleSitesMessage,
  ModuleEnd,
  ModuleSite,
  ModuleSitesFound
} from '../../../src/bridge/common/graph-module-sites.type.ts';

const INDEX_END: ModuleEnd = { kind: 'file', path: 'index.ts' };

/** A site's target is a file or a stub, never a folder, so the ends a site can point at keep that narrower type. */
const MAIN_END: ModuleSite['target'] = { kind: 'file', path: 'src/views/main.ts' };

const PANEL_END: ModuleSite['target'] = { kind: 'file', path: 'src/views/panel.ts' };

const MATH_END: ModuleSite['target'] = { kind: 'file', path: 'src/model/util/math.ts' };

const TEXT_END: ModuleSite['target'] = { kind: 'file', path: 'src/model/util/text.ts' };

const VIEWS_END: ModuleEnd = { kind: 'dir', path: 'src/views' };

const MODEL_END: ModuleEnd = { kind: 'dir', path: 'src/model' };

const LIB_END: ModuleSite['target'] = { kind: 'stub', name: 'lib' };

/** Tapping the `index.ts` card in `MODULES_APP_STUB`'s view. */
export const INDEX_ASK_STUB: GraphScanModuleSitesMessage = { type: 'scanModuleSites', packageName: 'app', from: INDEX_END, to: null };

/** Tapping the `main.ts` card once `views` is expanded. */
export const MAIN_ASK_STUB: GraphScanModuleSitesMessage = { type: 'scanModuleSites', packageName: 'app', from: MAIN_END, to: null };

/** Tapping the D9 link between the `views` and `model` folder cards. */
export const LINK_ASK_STUB: GraphScanModuleSitesMessage = {
  type: 'scanModuleSites',
  packageName: 'app',
  from: VIEWS_END,
  to: MODEL_END
};

/** Tapping the `lib` stub card. */
export const LIB_ASK_STUB: GraphScanModuleSitesMessage = { type: 'scanModuleSites', packageName: 'app', from: LIB_END, to: null };

const INDEX_MAIN_SITE: ModuleSite = {
  file: 'index.ts',
  line: 0,
  text: "import { main } from './src/views/main.ts';",
  kind: 'static',
  isType: false,
  target: MAIN_END
};

const MAIN_PANEL_SITE: ModuleSite = {
  file: 'src/views/main.ts',
  line: 0,
  text: "import { panel } from './panel.ts';",
  kind: 'static',
  isType: false,
  target: PANEL_END
};

const MAIN_MATH_SITE: ModuleSite = {
  file: 'src/views/main.ts',
  line: 1,
  text: "import type { Vec } from '../model/util/math.ts';",
  kind: 'static',
  isType: true,
  target: MATH_END
};

const SPEC_MAIN_SITE: ModuleSite = {
  file: 'src/views/main.spec.ts',
  line: 2,
  text: "import { main } from './main.ts';",
  kind: 'static',
  isType: false,
  target: MAIN_END
};

const PANEL_TEXT_SITE: ModuleSite = {
  file: 'src/views/panel.ts',
  line: 3,
  text: "const text = await import('../model/util/text.ts');",
  kind: 'dynamic',
  isType: false,
  target: TEXT_END
};

const PANEL_LIB_SITE: ModuleSite = {
  file: 'src/views/panel.ts',
  line: 0,
  text: "import { lib } from 'lib';",
  kind: 'static',
  isType: false,
  target: LIB_END
};

/** `index.ts` imports `main.ts`; nothing imports it. */
export const INDEX_SITES_STUB: ModuleSitesFound = {
  kind: 'found',
  imports: [INDEX_MAIN_SITE],
  importsTotal: 1,
  importedBy: [],
  importedByTotal: 0,
  limit: null
};

/** `main.ts` imports `panel.ts` and, type-only, `math.ts`; `index.ts` and its test file import it. */
export const MAIN_SITES_STUB: ModuleSitesFound = {
  kind: 'found',
  imports: [MAIN_PANEL_SITE, MAIN_MATH_SITE],
  importsTotal: 2,
  importedBy: [INDEX_MAIN_SITE, SPEC_MAIN_SITE],
  importedByTotal: 2,
  limit: null
};

/** The `views → model` link: the type-only `math.ts` line and the dynamic `text.ts` one. */
export const LINK_SITES_STUB: ModuleSitesFound = {
  kind: 'found',
  imports: [MAIN_MATH_SITE, PANEL_TEXT_SITE],
  importsTotal: 2,
  importedBy: [],
  importedByTotal: 0,
  limit: null
};

/** The `lib` stub: `panel.ts` imports it. */
export const LIB_SITES_STUB: ModuleSitesFound = {
  kind: 'found',
  imports: [],
  importsTotal: 0,
  importedBy: [PANEL_LIB_SITE],
  importedByTotal: 1,
  limit: null
};
