import { beforeEach, describe, expect, it } from 'vitest';

import { GraphFolders } from './graph-folders.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { FoldersRig } from '../test/common/graph-folders.type.ts';
import { foldersRigMock } from '../test/mocks/graph-folders.mock.ts';

type LabelOf = (folder: string) => string;

const sceneOf = (rig: FoldersRig, call: number): FolderScene | null | undefined => rig.showFolders.mock.calls[call]?.[0];

const labelOfCall = (rig: FoldersRig, call: number): LabelOf | undefined => rig.showFolders.mock.calls[call]?.[1];

describe('FEATURE: GraphFolders', () => {
  let rig: FoldersRig;
  let folders: GraphFolders;

  beforeEach(() => {
    rig = foldersRigMock();
    folders = new GraphFolders(rig.deps);
  });

  describe('GIVEN the boards graph drawn grouped', () => {
    describe('WHEN apps is toggled', () => {
      beforeEach(() => {
        folders.toggle('apps');
      });

      it('THEN apps is collapsed', () => {
        expect(folders.collapsed()).toStrictEqual(new Set(['apps']));
      });

      it('THEN the inspection is repainted once with the scene that is drawn once', () => {
        expect(rig.repaint).toHaveBeenCalledOnce();
        expect(rig.showFolders).toHaveBeenCalledOnce();
        expect(rig.repaint.mock.calls[0]?.[0]).toBe(sceneOf(rig, 0));
      });

      it('THEN the repaint runs before the folder pass', () => {
        const [repaintOrder] = rig.repaint.mock.invocationCallOrder;
        const [showOrder] = rig.showFolders.mock.invocationCallOrder;

        expect(repaintOrder).toBeLessThan(showOrder ?? 0);
      });

      it('THEN the drawn scene has apps collapsed', () => {
        expect(sceneOf(rig, 0)?.collapsed).toStrictEqual(new Set(['apps']));
      });

      it('THEN onCollapsed runs once for apps', () => {
        expect(rig.onCollapsed).toHaveBeenCalledExactlyOnceWith('apps');
      });

      it('THEN the label of apps is its title and package count', () => {
        expect(labelOfCall(rig, 0)?.('apps')).toBe('apps\n2 packages');
      });

      it('THEN the label of the root folder starts with its title', () => {
        expect(labelOfCall(rig, 0)?.('')).toMatch(/^\(root\)\n/u);
      });

      it('WHEN apps is toggled again THEN it is expanded and onCollapsed does not run again', () => {
        folders.toggle('apps');

        expect(folders.collapsed()).toStrictEqual(new Set());
        expect(sceneOf(rig, 1)?.collapsed).toStrictEqual(new Set());
        expect(rig.onCollapsed).toHaveBeenCalledOnce();
      });
    });

    it('WHEN a folder the graph lacks is toggled THEN nothing is collapsed or drawn', () => {
      folders.toggle('gone');

      expect(folders.collapsed()).toStrictEqual(new Set());
      expect(rig.showFolders).not.toHaveBeenCalled();
      expect(rig.onCollapsed).not.toHaveBeenCalled();
    });

    it('WHEN ui is a ghost and config hidden THEN the scene reads them from the deps', () => {
      rig.world.ghosts = ['@acme/ui'];
      rig.world.visible = new Set(['docs', 'web', '@acme/utils']);

      const scene = folders.scene();

      expect(scene?.ghosts).toStrictEqual(new Set(['@acme/ui']));
      expect(scene?.visible).toStrictEqual(new Set(['docs', 'web', '@acme/utils']));
    });

    it('WHEN apps and packages are collapsed and apps and gone expanded THEN only packages stays collapsed, drawn once more', () => {
      folders.toggle('apps');
      folders.toggle('packages');

      folders.expand(['apps', 'gone']);

      expect(folders.collapsed()).toStrictEqual(new Set(['packages']));
      expect(rig.showFolders).toHaveBeenCalledTimes(3);
      expect(sceneOf(rig, 2)?.collapsed).toStrictEqual(new Set(['packages']));
    });

    it('WHEN the folder pass alone is shown THEN the scene is drawn and nothing repainted', () => {
      folders.show();

      expect(rig.showFolders).toHaveBeenCalledOnce();
      expect(rig.repaint).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the checkbox mode is not the mode on screen', () => {
    beforeEach(() => {
      rig.world.canAct = false;
    });

    it('WHEN apps is toggled THEN nothing is collapsed, drawn or timed', () => {
      folders.toggle('apps');

      expect(folders.collapsed()).toStrictEqual(new Set());
      expect(rig.showFolders).not.toHaveBeenCalled();
      expect(folders.toggleMs()).toBeNull();
    });
  });

  describe('GIVEN no graph is drawn', () => {
    beforeEach(() => {
      rig.world.drawn = null;
    });

    it('WHEN the scene is read THEN it is null', () => {
      expect(folders.scene()).toBeNull();
    });

    it('WHEN apps is toggled THEN nothing is collapsed or drawn', () => {
      folders.toggle('apps');

      expect(folders.collapsed()).toStrictEqual(new Set());
      expect(rig.showFolders).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the graph is drawn flat', () => {
    beforeEach(() => {
      rig.world.isGrouped = false;
    });

    it('WHEN the scene is read THEN it is null', () => {
      expect(folders.scene()).toBeNull();
    });

    it('WHEN the folders are redrawn THEN the repaint and the folder pass get null', () => {
      folders.redraw();

      expect(rig.repaint).toHaveBeenCalledExactlyOnceWith(null);
      expect(sceneOf(rig, 0)).toBeNull();
    });
  });

  describe('GIVEN apps toggled at clock 100', () => {
    beforeEach(() => {
      rig.world.clock = 100;
      folders.toggle('apps');
    });

    it('WHEN no frame was drawn yet THEN the toggle time is null', () => {
      expect(folders.toggleMs()).toBeNull();
    });

    it('WHEN a frame is drawn at 140 THEN the toggle took 40 ms', () => {
      rig.world.clock = 140;

      folders.rendered();

      expect(folders.toggleMs()).toBe(40);
    });

    it('WHEN frames are drawn at 140 and 190 THEN the first one counts', () => {
      rig.world.clock = 140;
      folders.rendered();
      rig.world.clock = 190;

      folders.rendered();

      expect(folders.toggleMs()).toBe(40);
    });

    it('WHEN a frame is drawn and apps toggled again THEN the toggle time is null again', () => {
      rig.world.clock = 140;
      folders.rendered();

      folders.toggle('apps');

      expect(folders.toggleMs()).toBeNull();
    });
  });

  it('GIVEN no toggle WHEN a frame is drawn THEN the toggle time stays null', () => {
    folders.rendered();

    expect(folders.toggleMs()).toBeNull();
  });
});
