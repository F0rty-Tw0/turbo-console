import { describe, expect, it, vi } from 'vitest';

import { editorRunOptionsPorts } from './run-options-ports.ts';
import type { RunControl, RunRequest } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

vi.mock('vscode', () => {
  const module = { window: {} };

  return module;
});

/** Stands in for `RunSession`: its `run` reads a field of its own, so it works only when called on the control. */
class SessionControl implements Pick<RunControl, 'run'> {
  public readonly requests: RunRequest[] = [];

  public async run(request: RunRequest): Promise<void> {
    await Promise.resolve();
    this.requests.push(request);
  }
}

describe('FEATURE: Run with Options editor ports', () => {
  it('GIVEN a control whose run reads its own fields WHEN the ports run a request THEN the control runs it', async () => {
    const control = new SessionControl();
    const ports = editorRunOptionsPorts(control);

    await ports.run(RUN_REQUEST_STUB);

    expect(control.requests).toStrictEqual([RUN_REQUEST_STUB]);
  });
});
