import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRunAll } from './register-run-all.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { PACKAGE_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import type { RunAllDefinition, RunAllEvents, RunAllLaunch } from '../common/run-all.type.ts';
import { ALREADY_RUNNING_TEXT, START_TIMEOUT_MS } from '../common/run.const.ts';
import type { CommandRegistry, Disposed } from '../common/run.type.ts';
import type { RunAllFakes } from '../test/common/run-all-fakes.type.ts';
import { runAllFakes } from '../test/utils/run-all-ports.spec.util.ts';

const BUILD: RunAllDefinition = { root: '/one', id: '*build', affected: false };

const BUILD_AFFECTED: RunAllDefinition = { ...BUILD, affected: true };

const launchOf = (affected: boolean): RunAllLaunch => {
  const launch: RunAllLaunch = { root: '/one', binaryPath: TURBO_BINARY_STUB.path, taskName: 'build', affected };

  return launch;
};

describe('FEATURE: run all commands', () => {
  let fakes: RunAllFakes;
  let commands: Map<string, (arg: unknown) => unknown>;
  let events: RunAllEvents | null;
  let unregister: Mock<() => void>;
  let unsubscribe: Mock<() => void>;
  let registered: Disposed;

  const command = async (name: string): Promise<void> => {
    await commands.get(name)?.(undefined);
  };

  const fire = (): RunAllEvents => {
    if (events === null) throw new Error('no event source was subscribed');

    return events;
  };

  beforeEach(() => {
    vi.useFakeTimers();

    const roots = new RootStore();

    roots.set([{ root: '/one', name: 'one' }], coordinatorMock);
    roots.apply('/one', loadedWith([PACKAGE_NODE_STUB]));
    fakes = runAllFakes();
    commands = new Map();
    events = null;
    unregister = vi.fn<() => void>();
    unsubscribe = vi.fn<() => void>();

    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: unregister };

      commands.set(name, callback);

      return disposed;
    };

    registered = registerRunAll(
      roots,
      fakes.ports,
      (subscribed) => {
        events = subscribed;

        const subscription: Disposed = { dispose: unsubscribe };

        return subscription;
      },
      register
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('GIVEN the run all commands WHEN they are registered THEN Run Everywhere and Run Affected are registered', () => {
    const names = commands.keys();

    expect([...names]).toStrictEqual(['turboConsole.runEverywhere', 'turboConsole.runAffected']);
  });

  it('WHEN each command runs THEN the first launches without --affected and the second with it', async () => {
    fakes.choose('build', 'build');

    await command('turboConsole.runEverywhere');
    await command('turboConsole.runAffected');

    expect(fakes.execute.mock.calls).toStrictEqual([
      [launchOf(false), ['--skip-infer', 'run', 'build']],
      [launchOf(true), ['--skip-infer', 'run', 'build', '--affected']]
    ]);
  });

  describe('GIVEN a run all of build that started', () => {
    beforeEach(async () => {
      fakes.choose('build');
      await command('turboConsole.runEverywhere');
    });

    it('WHEN it is run again before its task ends THEN it says already running and launches once', async () => {
      fakes.choose('build');

      await command('turboConsole.runEverywhere');

      expect(fakes.execute).toHaveBeenCalledOnce();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(ALREADY_RUNNING_TEXT);
    });

    it('WHEN its task ends and it is run again THEN it launches again, with no message', async () => {
      fire().taskEnded(BUILD);
      fakes.choose('build');

      await command('turboConsole.runEverywhere');

      expect(fakes.execute).toHaveBeenCalledTimes(2);
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the task of the affected run ends THEN this run is still held', async () => {
      fire().taskEnded(BUILD_AFFECTED);
      fakes.choose('build');

      await command('turboConsole.runEverywhere');

      expect(fakes.execute).toHaveBeenCalledOnce();
    });

    it('WHEN its process starts and the start timeout passes THEN the run is still held', async () => {
      fire().processStarted(BUILD);
      vi.advanceTimersByTime(START_TIMEOUT_MS);
      fakes.choose('build');

      await command('turboConsole.runEverywhere');

      expect(fakes.execute).toHaveBeenCalledOnce();
    });
  });

  it('WHEN it is disposed THEN both commands and the event subscription are disposed', () => {
    registered.dispose();

    expect(unregister).toHaveBeenCalledTimes(2);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
