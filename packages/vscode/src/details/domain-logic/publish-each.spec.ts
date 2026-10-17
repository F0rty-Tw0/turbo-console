import { describe, expect, it, vi } from 'vitest';

import { publishEach } from './publish-each.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { OpenPanel } from '../common/panel.type.ts';
import { viewMock } from '../test/mocks/panel-host.mock.ts';

const KEY: PanelKey = { root: '/ws', packageName: 'a' };

const panelOf = (publish: () => void): OpenPanel => {
  const session = { receive: vi.fn(), publish, whenIdle: vi.fn(), dispose: vi.fn() };
  const panel: OpenPanel = { key: KEY, view: viewMock().view, session, posted: [] };

  return panel;
};

describe('FEATURE: publishing every panel', () => {
  it('GIVEN two panels WHEN published THEN each publishes once and nothing is logged', () => {
    const first = vi.fn();
    const second = vi.fn();
    const log = vi.fn();

    publishEach([panelOf(first), panelOf(second)], log);

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
  });

  it('GIVEN a first panel that throws WHEN published THEN the second still publishes and the failure is logged', () => {
    const broken = vi.fn(() => {
      throw new Error('publish broke');
    });
    const second = vi.fn();
    const log = vi.fn();

    publishEach([panelOf(broken), panelOf(second)], log);

    expect(second).toHaveBeenCalledOnce();
    expect(log.mock.calls).toStrictEqual([[expect.stringContaining('publish broke')]]);
  });
});
