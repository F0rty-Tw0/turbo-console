import type { GraphAffectedMark } from './graph-affected.type.ts';
import type { GraphAtomOutcome } from './graph-atoms-message.type.ts';
import type { ImportKind, ImportLimit, ImportVia } from './graph-imports.type.ts';
import type { GraphPrediction, ManifestField } from './graph-message.type.ts';
import type { GraphRunState } from './graph-state.type.ts';

/** The `package.json` fields an edge is explained from, in the order their entries are listed. */
export const MANIFEST_FIELDS: ManifestField[] = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/** The longest `key` or `spec` of a manifest entry before the host cuts it. */
export const ENTRY_TEXT_MAX = 200;

/** The most entries one explained edge carries. */
export const MANIFEST_ENTRIES_MAX = 8;

/** The highest 0-based line the page and the host accept: a `package.json` entry's, or an import site's. */
export const MANIFEST_LINE_MAX = 1_000_000;

/** The longest file path a reply names, a `package.json` or an import site's file; the page rejects a longer one. */
export const MANIFEST_FILE_MAX = 1_024;

/** The most import sites one `edgeImports` reply carries; the rest count only in `total` (spec D8, D11). */
export const IMPORT_SITES_MAX = 200;

/** The import kinds a site may carry; a `Record`, so a new kind must be added here. */
export const IMPORT_KINDS: Readonly<Record<ImportKind, true>> = { static: true, reexport: true, dynamic: true, require: true };

/** The ways a site may name the target; a `Record`, so a new way must be added here. */
export const IMPORT_VIAS: Readonly<Record<ImportVia, true>> = { name: true, relative: true, alias: true };

/** The limits a scan may stop at; a `Record`, so a new limit must be added here. */
export const IMPORT_LIMITS: Readonly<Record<ImportLimit, true>> = { files: true, entries: true, time: true };

/** The highest `taskCount` the page accepts. */
export const TASK_COUNT_MAX = 100_000;

/** The words of `GraphRunState` the page accepts in a `runs` message. */
export const RUN_STATES: GraphRunState[] = ['running', 'continuous', 'passed', 'failed', 'stopped', 'failed-to-start'];

/** The words of `GraphPrediction` the page accepts in the `predictions` of a `runs` message. */
export const PREDICTION_WORDS: GraphPrediction[] = ['cached', 'notCached', 'unknown'];

/** The words of `GraphAffectedMark` the page accepts in the `affected` of a `runs` message. */
export const AFFECTED_MARKS: GraphAffectedMark[] = ['changed', 'dependency'];

/** The words of `GraphAtomOutcome` the page accepts in an `atoms` message. */
export const ATOM_OUTCOMES: GraphAtomOutcome[] = ['passed', 'failed', 'cached', 'none'];
