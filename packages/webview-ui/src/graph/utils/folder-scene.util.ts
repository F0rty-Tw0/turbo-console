import { folderOf } from './folder-group.util.ts';
import { folderLinksOf } from './folder-links.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';

const isDrawn = (name: string, visible: ReadonlySet<string>, ghosts: ReadonlySet<string>): boolean => {
  const isVisible = visible.has(name);
  const isGhost = ghosts.has(name);

  return isVisible || isGhost;
};

/** The folders with a package in `visible` or `ghosts`. */
const shownOf = (members: ReadonlyMap<string, string[]>, visible: ReadonlySet<string>, ghosts: ReadonlySet<string>): Set<string> => {
  const shown = new Set<string>();

  for (const [folder, names] of members) {
    const hasDrawn = names.some((name) => isDrawn(name, visible, ghosts));

    if (hasDrawn) shown.add(folder);
  }

  return shown;
};

/** What the folder pass draws: each package's folder, the members per folder, the shown folders and the folder links. */
export const folderSceneOf = (
  infos: GraphPackage[],
  edges: GraphEdge[],
  collapsed: ReadonlySet<string>,
  visible: ReadonlySet<string>,
  ghosts: ReadonlySet<string>
  // eslint-disable-next-line max-params -- five inputs, pinned by the plan's Cross-phase interfaces (Task 2.1)
): FolderScene => {
  const folderByName = new Map<string, string>();
  const members = new Map<string, string[]>();

  for (const pkg of infos) {
    const folder = folderOf(pkg.path);
    const names = members.get(folder) ?? [];

    names.push(pkg.name);
    folderByName.set(pkg.name, folder);
    members.set(folder, names);
  }

  const requested = [...collapsed];
  const existing = requested.filter((folder) => members.has(folder));
  const shown = shownOf(members, visible, ghosts);
  const links = folderLinksOf(edges, visible, folderByName, collapsed);
  const scene: FolderScene = {
    folderOf: folderByName,
    members,
    collapsed: new Set(existing),
    visible,
    ghosts,
    shown,
    links,
    edges
  };

  return scene;
};
