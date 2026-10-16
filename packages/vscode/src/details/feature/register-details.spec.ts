import { describe, expect, it, vi } from 'vitest';

import { registerDetails } from './register-details.ts';
import type { CommandRegistry } from '../../run/common/run.type.ts';
import type { PanelOpener } from '../common/panel.type.ts';

const COMMAND = 'turboConsole.openPackageDetails';
const PACKAGE_ROW = { kind: 'pkg', root: '/ws', packageName: 'a', id: 'row-1' };
const MANIFEST = '/ws/packages/a/package.json';

type Registered = {
  readonly register: CommandRegistry;
  readonly run: (arg: unknown) => unknown;
  readonly unregister: ReturnType<typeof vi.fn>;
};

const registrationMock = (): Registered => {
  const handlers = new Map<string, (arg: unknown) => unknown>();
  const unregister = vi.fn();
  const register: CommandRegistry = (command, callback) => {
    handlers.set(command, callback);

    const disposable = { dispose: unregister };

    return disposable;
  };
  const run = (arg: unknown): unknown => handlers.get(COMMAND)?.(arg);
  const registered: Registered = { register, run, unregister };

  return registered;
};

const openerMock = (): PanelOpener => {
  const open = vi.fn().mockResolvedValue(null);
  const openFile = vi.fn().mockResolvedValue(null);
  const opener: PanelOpener = { open, openFile, dispose: vi.fn() };

  return opener;
};

describe('FEATURE: the Open Package Details command', () => {
  it('GIVEN a package row WHEN the command runs THEN that root and package open, never a file', async () => {
    const panels = openerMock();
    const registered = registrationMock();

    registerDetails(panels, registered.register, () => MANIFEST);

    await registered.run(PACKAGE_ROW);

    expect(panels.open).toHaveBeenCalledExactlyOnceWith({ root: '/ws', packageName: 'a' });
    expect(panels.openFile).not.toHaveBeenCalled();
  });

  it('GIVEN a resource that is not a row WHEN the command runs THEN the manifest file of that resource opens', async () => {
    const panels = openerMock();
    const registered = registrationMock();
    const fileOf = vi.fn(() => MANIFEST);

    registerDetails(panels, registered.register, fileOf);
    const resource = { scheme: 'file' };

    await registered.run(resource);

    expect(fileOf).toHaveBeenCalledExactlyOnceWith(resource);
    expect(panels.openFile).toHaveBeenCalledExactlyOnceWith(MANIFEST);
    expect(panels.open).not.toHaveBeenCalled();
  });

  it('GIVEN no argument and no active file WHEN the command runs THEN null is passed to the registry', async () => {
    const panels = openerMock();
    const registered = registrationMock();

    registerDetails(panels, registered.register, () => null);

    await registered.run(undefined);

    expect(panels.openFile).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('GIVEN the command is registered WHEN it is disposed THEN the command is removed and every panel closes', () => {
    const panels = openerMock();
    const registered = registrationMock();
    const details = registerDetails(panels, registered.register, () => null);

    details.dispose();

    expect(registered.unregister).toHaveBeenCalledOnce();
    expect(panels.dispose).toHaveBeenCalledOnce();
  });
});
