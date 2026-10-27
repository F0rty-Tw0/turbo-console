import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { focusPackageInGraph } from './focus-package-graph.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import type { GraphOpener, OpenGraphPanel, RootPickPorts } from '../common/graph-panel.type.ts';

const OPEN_FAILED_TEXT = 'Could not open the Package Graph. See Output.';
const PACKAGE_ROW = { kind: 'pkg', root: '/r', packageName: 'web' };
const TASK_ROW = { kind: 'task', root: '/other', key: 'api#build', packageName: 'api' };

type Fixture = {
  readonly panels: Pick<GraphOpener, 'open'>;
  readonly ports: Pick<RootPickPorts, 'log' | 'error'>;
  readonly open: Mock<GraphOpener['open']>;
  readonly show: Mock<OpenGraphPanel['session']['show']>;
};

const panelOf = (show: Mock<OpenGraphPanel['session']['show']>): OpenGraphPanel => {
  const session: OpenGraphPanel['session'] = { receive: vi.fn(), show, dispose: vi.fn() };
  const { view } = viewMock<GraphHostMessage>(true);
  const panel: OpenGraphPanel = { root: '/r', view, session, posted: [] };

  return panel;
};

const fixtureOf = (): Fixture => {
  const show = vi.fn<OpenGraphPanel['session']['show']>();
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(panelOf(show));
  const ports = { log: vi.fn<(text: string) => void>(), error: vi.fn<(text: string) => void>() };
  const panels: Fixture['panels'] = { open };
  const fixture: Fixture = { panels, ports, open, show };

  return fixture;
};

const throwingOpen = (): never => {
  throw new Error('ENOENT: index.html');
};

describe('FEATURE: the Focus on Graph command', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = fixtureOf();
  });

  describe('GIVEN a package row', () => {
    it('WHEN it runs THEN the panel of its root opens and is asked to show the package', () => {
      focusPackageInGraph(PACKAGE_ROW, fixture);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/r');
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showPackage', name: 'web' });
    });
  });

  describe('GIVEN a task row', () => {
    it('WHEN it runs THEN the panel of its root is asked to show the package of the task', () => {
      focusPackageInGraph(TASK_ROW, fixture);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/other');
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showPackage', name: 'api' });
    });
  });

  describe('GIVEN an argument that is not a package row', () => {
    it.each([[undefined], [{ kind: 'folder' }], [{ kind: 'pkg', root: 1, packageName: 'web' }], [{ kind: 'pkg', root: '/r' }]])(
      'WHEN the argument is %j THEN nothing opens',
      (arg) => {
        focusPackageInGraph(arg, fixture);

        expect(fixture.open).not.toHaveBeenCalled();
        expect(fixture.show).not.toHaveBeenCalled();
      }
    );
  });

  describe('GIVEN the registry opens no panel', () => {
    it('WHEN it runs THEN nothing throws and nothing is shown', () => {
      fixture.open.mockReturnValue(null);

      focusPackageInGraph(PACKAGE_ROW, fixture);

      expect(fixture.show).not.toHaveBeenCalled();
      expect(fixture.ports.error).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN opening the panel throws', () => {
    it('WHEN it runs THEN the failure is logged and the open-failed error is shown', () => {
      fixture.open.mockImplementation(throwingOpen);

      focusPackageInGraph(PACKAGE_ROW, fixture);

      expect(fixture.ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('ENOENT: index.html'));
      expect(fixture.ports.error).toHaveBeenCalledExactlyOnceWith(OPEN_FAILED_TEXT);
    });
  });
});
