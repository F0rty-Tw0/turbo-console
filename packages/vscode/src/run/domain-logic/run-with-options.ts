import type { Roots } from '../../roots/common/coordinator.type.ts';
import { ARGS_PLACEHOLDER, CONCURRENCY_PLACEHOLDER, CONCURRENCY_PROMPT } from '../common/run-options.const.ts';
import type { InputAsk, RunOptionsPorts, RunPicks } from '../common/run-options.type.ts';
import type { RunRequest } from '../common/run.type.ts';
import { concurrencyError } from '../utils/concurrency-input.util.ts';
import { optionItemsOf } from '../utils/option-items.util.ts';
import { extrasOf } from '../utils/run-extras.util.ts';
import { pickerPlaceholderOf, scriptArgsPromptOf, turboArgsPromptOf } from '../utils/run-options-text.util.ts';
import { refusalOf } from '../utils/run-refusal.util.ts';
import { runRequestOf, taskTargetOf } from '../utils/run-target.util.ts';
import { runnableStateOf } from '../utils/runnable-state.util.ts';
import { splitArgs } from '../utils/split-args.util.ts';

const argsError = (text: string): string | null => {
  const split = splitArgs(text);

  if ('error' in split) return split.error;

  return null;
};

/** The arguments typed in the box; `undefined` when it is closed. VS Code hands back only a text `argsError` accepted. */
const askArgs = async (ports: RunOptionsPorts, prompt: string): Promise<string[] | undefined> => {
  const ask: InputAsk = { prompt, placeholder: ARGS_PLACEHOLDER, validate: argsError };
  const text = await ports.input(ask);

  if (text === undefined) return undefined;

  const split = splitArgs(text);

  if ('error' in split) return undefined;

  return split.args;
};

const askConcurrency = async (ports: RunOptionsPorts): Promise<string | undefined> => {
  const ask: InputAsk = { prompt: CONCURRENCY_PROMPT, placeholder: CONCURRENCY_PLACEHOLDER, validate: concurrencyError };
  const text = await ports.input(ask);

  return text?.trim();
};

const scriptPicksOf = async (ports: RunOptionsPorts, request: RunRequest): Promise<RunPicks | undefined> => {
  const refusal = refusalOf(request);

  if (refusal !== null) {
    ports.info(refusal);

    return undefined;
  }

  const prompt = scriptArgsPromptOf(request.packageManager.name, request.task.name);
  const args = await askArgs(ports, prompt);

  if (args === undefined) return undefined;

  const picks: RunPicks = { options: ['passThrough'], concurrency: null, args };

  return picks;
};

const turboPicksOf = async (ports: RunOptionsPorts, request: RunRequest): Promise<RunPicks | undefined> => {
  const items = optionItemsOf(request.task);
  const placeholder = pickerPlaceholderOf(request.task.name, request.packageName);
  const chosen = await ports.pickMany(items, placeholder);

  if (chosen === undefined) return undefined;

  const options = chosen.map((item) => item.option);
  const hasConcurrency = options.includes('concurrency');
  const hasArgs = options.includes('passThrough');
  let concurrency: string | null = null;
  let args: string[] = [];

  if (hasConcurrency) {
    const text = await askConcurrency(ports);

    if (text === undefined) return undefined;

    concurrency = text;
  }

  if (hasArgs) {
    const typed = await askArgs(ports, turboArgsPromptOf(request.task.name));

    if (typed === undefined) return undefined;

    args = typed;
  }

  const picks: RunPicks = { options, concurrency, args };

  return picks;
};

const picksOf = async (ports: RunOptionsPorts, request: RunRequest): Promise<RunPicks | undefined> => {
  if (request.task.isTurboTask) return turboPicksOf(ports, request);

  return scriptPicksOf(ports, request);
};

/**
 * Run with Options on a task row: the picker (a script row skips it and asks only for its arguments), the boxes the picks
 * need, then one run. The request is built again after the last answer, so a binary, root or task that changed while a
 * dialog was open decides what runs; a task gone, or turned from turbo task to script or back, ends silently.
 */
export const runWithOptions = async (roots: Roots, ports: RunOptionsPorts, arg: unknown): Promise<void> => {
  const target = taskTargetOf(arg);

  if (target === null) return;

  const state = await runnableStateOf(roots, target);
  const plain = runRequestOf(target, state, false);

  if (plain === null) return;

  const picks = await picksOf(ports, plain);

  if (picks === undefined) return;

  const isForce = picks.options.includes('force');
  const latest = runRequestOf(target, roots.get(target.definition.root)?.state, isForce);

  if (latest === null) return;

  if (latest.task.isTurboTask !== plain.task.isTurboTask) return;

  const extras = extrasOf(picks);

  if (extras === null) {
    await ports.run(latest);

    return;
  }

  const request: RunRequest = { ...latest, extras };

  await ports.run(request);
};
