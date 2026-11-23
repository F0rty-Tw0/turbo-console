import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { moduleInputOf } from './graph-module-input.ts';
import { GraphModuleMode } from './graph-module-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphPackageModulesMessage } from '../../bridge/common/graph-modules.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { HandledModules, ModuleCanvas } from '../common/module-canvas.type.ts';
import type { ModuleInputSelection, ModuleRedraw } from '../common/module-mode.type.ts';
import type { ModuleModeRig } from '../test/common/graph-module-mode.type.ts';
import { moduleCanvasMock } from '../test/mocks/module-canvas.mock.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { REPLY_AT, RIG_CAMERA, WEB_LISTED, moduleModeRigOf } from '../test/utils/graph-module-mode.spec.util.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';

const FOUND: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: MODULES_FOUND_STUB };

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_SRC_LIB_OPEN: ModulesViewState = { ...FRESH_WEB, expanded: ['src', 'src/lib'] };

const WEB_SRC_OPEN: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

const KEEP: ModuleRedraw = { kind: 'keep' };

describe('FEATURE: moduleInputOf', () => {
  let rig: ModuleModeRig;
  let modes: ViewStateModes;
  let mode: GraphModuleMode;
  let canvas: Mocked<ModuleCanvas>;
  let container: Mocked<Pick<HTMLElement, 'focus'>>;
  let selection: Mocked<ModuleInputSelection>;
  let input: HandledModules;

  /** Modules mode over a real `ViewStateModes` with web saved as `src` and `src/lib` expanded, Loading web. */
  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    modes = new ViewStateModes(saver, null);
    modes.saveModules(WEB_SRC_LIB_OPEN, '');
    rig = moduleModeRigOf(modes);
    mode = new GraphModuleMode(rig.deps);
    canvas = moduleCanvasMock();
    container = { focus: vi.fn() };
    selection = { select: vi.fn(), clear: vi.fn() };
    input = moduleInputOf({ mode, canvas, container, bridge: rig.deps.bridge, selection });
    mode.received(WEB_LISTED);
    mode.enter('web');
  });

  describe('GIVEN Loading web', () => {
    it('WHEN a file is tapped THEN nothing is painted', () => {
      canvas.kindOf.mockReturnValue('file');
      input.tapNode('file:src/a.ts');

      expect(canvas.paint).not.toHaveBeenCalled();
    });

    it('WHEN a file is tapped THEN the canvas does not take focus', () => {
      canvas.kindOf.mockReturnValue('file');
      input.tapNode('file:src/a.ts');

      expect(container.focus).not.toHaveBeenCalled();
    });

    it('WHEN a file is double-tapped THEN nothing goes out but the scan ask', () => {
      canvas.kindOf.mockReturnValue('file');
      input.doubleTapNode('file:src/a.ts');

      expect(rig.post.mock.calls).toStrictEqual([[{ type: 'scanModules', packageName: 'web' }]]);
    });

    it('WHEN a link is tapped THEN select is not called and the container keeps its focus state', () => {
      input.tapLink('file:src/a.ts', 'dir:src/lib');

      expect(selection.select).not.toHaveBeenCalled();
      expect(container.focus).not.toHaveBeenCalled();
    });

    it('WHEN the background is tapped THEN clear is not called', () => {
      input.tapBackground();

      expect(selection.clear).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN Shown web with src expanded', () => {
    beforeEach(() => {
      mode.scanned(FOUND, REPLY_AT);
      mode.update(WEB_SRC_OPEN, KEEP);
    });

    it('WHEN the collapsed folder src/lib is tapped THEN it is expanded and redrawn anchored on it', () => {
      canvas.kindOf.mockReturnValue('dir');
      input.tapNode('dir:src/lib');

      expect(modes.modules()?.expanded).toContain('src/lib');
      expect(rig.screen.shown.mock.lastCall?.[3]).toStrictEqual({ kind: 'anchor', id: 'dir:src/lib' });
    });

    it('WHEN the collapsed folder src/lib is tapped twice before it is redrawn THEN the expansion is back to src alone', () => {
      canvas.kindOf.mockReturnValue('dir');
      input.tapNode('dir:src/lib');
      input.tapNode('dir:src/lib');

      expect(modes.modules()?.expanded).toStrictEqual(['src']);
    });

    it('WHEN the collapsed folder src/lib is tapped while a.ts is focused THEN nothing is saved or drawn', () => {
      mode.update({ ...WEB_SRC_OPEN, focus: 'file:src/a.ts' }, KEEP);
      canvas.kindOf.mockReturnValue('dir');
      const drawn = rig.screen.shown.mock.calls.length;

      input.tapNode('dir:src/lib');

      expect(modes.modules()?.expanded).toStrictEqual(['src']);
      expect(rig.screen.shown.mock.calls).toHaveLength(drawn);
    });

    it('WHEN the src box is tapped THEN src is collapsed', () => {
      canvas.kindOf.mockReturnValue('box');
      input.tapNode('dir:src');

      expect(modes.modules()?.expanded).not.toContain('src');
    });

    it('WHEN the root box is tapped THEN nothing is saved or drawn', () => {
      canvas.kindOf.mockReturnValue('box');
      const saved = modes.modules();
      const drawn = rig.screen.shown.mock.calls.length;

      input.tapNode('dir:');

      expect(modes.modules()).toBe(saved);
      expect(rig.screen.shown.mock.calls).toHaveLength(drawn);
    });

    it('WHEN a.ts is tapped THEN select gets {kind: node, id: file:src/a.ts} and the canvas is not painted by the input', () => {
      canvas.kindOf.mockReturnValue('file');
      input.tapNode('file:src/a.ts');

      expect(selection.select).toHaveBeenCalledExactlyOnceWith({ kind: 'node', id: 'file:src/a.ts' });
      expect(canvas.paint).not.toHaveBeenCalled();
    });

    it('WHEN the link src/a.ts → dir:src/lib is tapped THEN the container takes focus, then the link is selected', () => {
      input.tapLink('file:src/a.ts', 'dir:src/lib');
      const [focused] = container.focus.mock.invocationCallOrder;
      const [selected] = selection.select.mock.invocationCallOrder;

      expect(selection.select).toHaveBeenCalledExactlyOnceWith({ kind: 'link', source: 'file:src/a.ts', target: 'dir:src/lib' });
      expect(focused).toBeLessThan(selected ?? 0);
    });

    it.each([
      ['the collapsed folder src/lib', 'dir', 'dir:src/lib'],
      ['the src box', 'box', 'dir:src'],
      ['a.ts', 'file', 'file:src/a.ts']
    ] as const)('WHEN %s is tapped THEN the canvas takes focus back from the tap, which blurs it', (_, kind, id) => {
      canvas.kindOf.mockReturnValue(kind);
      input.tapNode(id);

      expect(container.focus).toHaveBeenCalledOnce();
    });

    it('WHEN the background is tapped THEN clear is called once', () => {
      input.tapBackground();

      expect(selection.clear).toHaveBeenCalledOnce();
      expect(canvas.paint).not.toHaveBeenCalled();
    });

    it('WHEN a.ts is double-tapped THEN openImport goes out at line 0', () => {
      canvas.kindOf.mockReturnValue('file');
      input.doubleTapNode('file:src/a.ts');

      expect(rig.post).toHaveBeenLastCalledWith({ type: 'openImport', packageName: 'web', file: 'src/a.ts', line: 0 });
    });

    it('WHEN a folder is double-tapped THEN nothing goes out', () => {
      canvas.kindOf.mockReturnValue('box');
      const before = rig.post.mock.calls.length;

      input.doubleTapNode('dir:src');

      expect(rig.post.mock.calls).toHaveLength(before);
    });

    it('WHEN the stub @s/x is double-tapped THEN modules mode enters @s/x', () => {
      canvas.kindOf.mockReturnValue('stub');
      input.doubleTapNode('pkg:@s/x');

      expect(mode.phase()).toStrictEqual({ kind: 'loading', name: '@s/x' });
    });
  });

  describe('GIVEN Shown web with src and src/lib expanded', () => {
    beforeEach(() => {
      mode.scanned(FOUND, REPLY_AT);
    });

    it('WHEN src is collapsed THEN src/lib stays listed, to show again when src opens', () => {
      canvas.kindOf.mockReturnValue('box');
      input.tapNode('dir:src');

      expect(modes.modules()?.expanded).toStrictEqual(['src/lib']);
    });

    it('WHEN the camera is saved THEN the view keeps the camera on screen', () => {
      input.saveCamera();

      expect(modes.modules()?.camera).toStrictEqual(RIG_CAMERA);
    });
  });
});
