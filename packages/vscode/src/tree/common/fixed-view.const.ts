import type { FixedItem } from './fixed-view.type.ts';
import type { RowCommand } from './tree-row.type.ts';

const RUN_EVERYWHERE: RowCommand = { command: 'turboConsole.runEverywhere', args: [] };

const RUN_AFFECTED: RowCommand = { command: 'turboConsole.runAffected', args: [] };

const REFRESH: RowCommand = { command: 'turboConsole.refresh', args: [] };

const OPEN_README: RowCommand = { command: 'turboConsole.openLink', args: ['readme'] };

const OPEN_BUG: RowCommand = { command: 'turboConsole.openLink', args: ['bug'] };

const OPEN_DOCS: RowCommand = { command: 'turboConsole.openLink', args: ['docs'] };

/** Spec §4.6.5 and §4.7: the Common Commands rows. */
export const COMMAND_ITEMS: FixedItem[] = [
  { id: 'runEverywhere', label: 'Run Task in All Packages…', icon: 'run-all', command: RUN_EVERYWHERE },
  { id: 'runAffected', label: 'Run Affected…', icon: 'git-compare', command: RUN_AFFECTED },
  { id: 'refresh', label: 'Refresh', icon: 'refresh', command: REFRESH }
];

/** Spec §4.6.7 and §4.7: the Help and Feedback rows; each opens its link id, never a url. */
export const HELP_ITEMS: FixedItem[] = [
  { id: 'readme', label: 'Turbo Console README', icon: 'book', command: OPEN_README },
  { id: 'bug', label: 'Report a Bug', icon: 'bug', command: OPEN_BUG },
  { id: 'docs', label: 'Turborepo Documentation', icon: 'link-external', command: OPEN_DOCS }
];
