import { create } from 'zustand';
import type { Group } from '../types/project';
import type { Photo } from '../types/photo';
import { usePhotoStore } from './photoStore';
import { autoGroupPhotos, type PairMatch } from '../group/groupEngine';
import * as editor from '../group/groupEditor';
import { saveGroup, deleteGroup, listGroupsByProject } from '../storage/db';

type Side = 'before' | 'after';

interface GroupStore {
  groups: Group[];
  lastPairMatches: PairMatch[];
  isGrouping: boolean;

  runAutoGrouping: (projectId: string) => Promise<void>;
  loadForProject: (projectId: string) => Promise<void>;
  clear: () => void;

  finalizeGroup: (groupId: string) => void;
  unlockGroup: (groupId: string) => void;
  setRepresentative: (groupId: string, side: Side, photoId: string) => void;
  setAfterInsertAnchor: (groupId: string, anchor: string | undefined) => void;
  applyAIResult: (groupId: string, aiScore: number) => void;
  swapBeforeAfter: (groupId: string) => void;
  removePhotoFromGroup: (groupId: string, photoId: string) => void;
  disbandGroup: (groupId: string) => void;
  addPhotoToGroup: (groupId: string, photoId: string, side: Side) => void;
  createGroupFromPhotos: (projectId: string, photoIds: string[]) => void;
  createGroupForBeforePhoto: (projectId: string, photoId: string) => void;
  mergeGroups: (groupIdA: string, groupIdB: string) => void;
  splitGroup: (groupId: string, photoIdsToSplit: string[]) => void;
}

function replaceGroup(groups: Group[], updated: Group): Group[] {
  return groups.map((g) => (g.groupId === updated.groupId ? updated : g));
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  lastPairMatches: [],
  isGrouping: false,

  runAutoGrouping: async (projectId) => {
    set({ isGrouping: true });
    try {
      const photos = usePhotoStore.getState().photos;
      // Locked groups (spec section 20) are protected from automatic re-grouping.
      const lockedGroups = get().groups.filter((g) => g.locked);
      const lockedPhotoIds = new Set(lockedGroups.flatMap((g) => g.photoIds));
      const candidatePhotos = photos.filter((p) => !lockedPhotoIds.has(p.photoId));

      const { groups: newGroups, pairMatches } = autoGroupPhotos(candidatePhotos, projectId);

      const staleGroups = get().groups.filter((g) => !g.locked);
      for (const g of staleGroups) deleteGroup(g.groupId);
      for (const g of newGroups) saveGroup(g);

      set({ groups: [...lockedGroups, ...newGroups], lastPairMatches: pairMatches });
    } finally {
      set({ isGrouping: false });
    }
  },

  loadForProject: async (projectId) => {
    const groups = await listGroupsByProject(projectId);
    set({ groups, lastPairMatches: [] });
  },

  clear: () => set({ groups: [], lastPairMatches: [] }),

  finalizeGroup: (groupId) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const updated = editor.finalizeGroup(group);
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  unlockGroup: (groupId) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const updated = editor.unlockGroup(group);
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  setRepresentative: (groupId, side, photoId) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const updated = editor.setRepresentative(group, side, photoId);
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  applyAIResult: (groupId, aiScore) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const updated = editor.applyAIResult(group, aiScore);
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  setAfterInsertAnchor: (groupId, anchor) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const updated = editor.setAfterInsertAnchor(group, anchor);
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  swapBeforeAfter: (groupId) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const updated = editor.swapBeforeAfter(group);
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  removePhotoFromGroup: (groupId, photoId) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const updated = editor.removePhotoFromGroup(group, photoId);
    if (!updated) {
      set({ groups: get().groups.filter((g) => g.groupId !== groupId) });
      deleteGroup(groupId);
      return;
    }
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  disbandGroup: (groupId) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (group?.locked) return;
    set({ groups: get().groups.filter((g) => g.groupId !== groupId) });
    deleteGroup(groupId);
  },

  addPhotoToGroup: (groupId, photoId, side) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    const photo = usePhotoStore.getState().photos.find((p) => p.photoId === photoId);
    if (!group || !photo) return;
    const updated = editor.addPhotoToGroup(group, photo, side);
    set({ groups: replaceGroup(get().groups, updated) });
    saveGroup(updated);
  },

  createGroupFromPhotos: (projectId, photoIds) => {
    const photoById = new Map(usePhotoStore.getState().photos.map((p) => [p.photoId, p] as [string, Photo]));
    const photos = photoIds.map((id) => photoById.get(id)).filter((p): p is Photo => !!p);
    if (photos.length < 2) return;
    const created = editor.createGroupFromPhotos(projectId, photos);
    set({ groups: [...get().groups, created] });
    saveGroup(created);
  },

  createGroupForBeforePhoto: (projectId, photoId) => {
    const photo = usePhotoStore.getState().photos.find((p) => p.photoId === photoId);
    if (!photo) return;
    const created = editor.createGroupForBeforePhoto(projectId, photo);
    set({ groups: [...get().groups, created] });
    saveGroup(created);
  },

  mergeGroups: (groupIdA, groupIdB) => {
    const groupA = get().groups.find((g) => g.groupId === groupIdA);
    const groupB = get().groups.find((g) => g.groupId === groupIdB);
    if (!groupA || !groupB || groupA.locked || groupB.locked) return;
    const merged = editor.mergeGroups(groupA, groupB);
    set({ groups: replaceGroup(get().groups, merged).filter((g) => g.groupId !== groupIdB) });
    saveGroup(merged);
    deleteGroup(groupIdB);
  },

  splitGroup: (groupId, photoIdsToSplit) => {
    const group = get().groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const photoById = new Map(usePhotoStore.getState().photos.map((p) => [p.photoId, p] as [string, Photo]));
    const { remaining, created } = editor.splitGroup(group, photoIdsToSplit, photoById);

    let groups = get().groups;
    if (remaining) {
      groups = replaceGroup(groups, remaining);
      saveGroup(remaining);
    } else {
      groups = groups.filter((g) => g.groupId !== groupId);
      deleteGroup(groupId);
    }
    if (created) {
      groups = [...groups, created];
      saveGroup(created);
    }
    set({ groups });
  },
}));
