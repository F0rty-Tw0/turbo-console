import { sortedNames } from './graph-package.spec.util.ts';
import type { ProbeFolder, ProbeFolderLink, ProbeState } from '../../../src/graph/common/graph-probe.type.ts';
import type { FolderFacts, FolderLinkFacts } from '../../common/graph-folders.type.ts';

const linkKey = (link: FolderLinkFacts): string => `${link.source}\u0000${link.target}`;

export const byFolder = (first: FolderFacts, second: FolderFacts): number => first.folder.localeCompare(second.folder);

export const byLink = (first: FolderLinkFacts, second: FolderLinkFacts): number => linkKey(first).localeCompare(linkKey(second));

/** What the e2e tests compare of a probe folder, its package names sorted. */
export const factsOf = (folder: ProbeFolder): FolderFacts => {
  const { isCollapsed, isVisible } = folder;
  const packages = sortedNames(folder.packages);
  const facts: FolderFacts = { folder: folder.folder, isCollapsed, isVisible, packages };

  return facts;
};

export const linkFactsOf = (link: ProbeFolderLink): FolderLinkFacts => {
  const facts: FolderLinkFacts = { source: link.source, target: link.target, count: link.count };

  return facts;
};

export const folderStateEntry = (folder: ProbeFolder): [string, ProbeState] => [folder.folder, folder.state];

export const linkStateEntry = (link: ProbeFolderLink): [string, ProbeState] => [`${link.source}>${link.target}`, link.state];

/** `facts` sorted by folder key; the input is not changed. */
export const sortedFolders = (facts: FolderFacts[]): FolderFacts[] => {
  const copy = [...facts];

  return copy.sort(byFolder);
};

/** `facts` sorted by link ends; the input is not changed. */
export const sortedLinks = (facts: FolderLinkFacts[]): FolderLinkFacts[] => {
  const copy = [...facts];

  return copy.sort(byLink);
};
