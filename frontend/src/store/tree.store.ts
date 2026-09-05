import { create } from 'zustand';
import type { FamilyTree, Member } from '@/types';
import * as treeService from '@/services/tree.service';

interface TreeStore {
  trees: FamilyTree[];
  currentTree: FamilyTree | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  fetchTrees: () => Promise<void>;
  fetchTree: (treeId: string) => Promise<void>;
  setCurrentTree: (tree: FamilyTree | null) => void;
  addTreeToList: (tree: FamilyTree) => void;
  updateTreeInList: (tree: FamilyTree) => void;
  removeTreeFromList: (treeId: string) => void;
  updateMemberInTree: (member: Member) => void;
  removeMemberFromTree: (memberId: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useTreeStore = create<TreeStore>()((set, _get) => ({
  trees: [],
  currentTree: null,
  isLoading: false,
  error: null,

  fetchTrees: async () => {
    set({ isLoading: true, error: null });
    try {
      const { trees } = await treeService.getTrees();
      set({ trees, isLoading: false });
    } catch (err) {
      set({ error: 'Không thể tải danh sách gia phả', isLoading: false });
    }
  },

  fetchTree: async (treeId: string) => {
    set({ isLoading: true, error: null });
    try {
      const tree = await treeService.getTree(treeId);
      set({ currentTree: tree, isLoading: false });
    } catch (err) {
      set({ error: 'Không thể tải thông tin gia phả', isLoading: false });
    }
  },

  setCurrentTree: (tree) => set({ currentTree: tree }),

  addTreeToList: (tree) =>
    set((state) => ({ trees: [...state.trees, tree] })),

  updateTreeInList: (updated) =>
    set((state) => ({
      trees: state.trees.map((t) => (t.treeId === updated.treeId ? updated : t)),
      currentTree: state.currentTree?.treeId === updated.treeId ? updated : state.currentTree,
    })),

  removeTreeFromList: (treeId) =>
    set((state) => ({
      trees: state.trees.filter((t) => t.treeId !== treeId),
      currentTree: state.currentTree?.treeId === treeId ? null : state.currentTree,
    })),

  updateMemberInTree: (member) =>
    set((state) => {
      if (!state.currentTree) return {};
      const members = state.currentTree.members?.map((m) =>
        m.memberId === member.memberId ? member : m
      ) || [];
      return { currentTree: { ...state.currentTree, members } };
    }),

  removeMemberFromTree: (memberId) =>
    set((state) => {
      if (!state.currentTree) return {};
      const members = state.currentTree.members?.filter((m) => m.memberId !== memberId) || [];
      const relationships = state.currentTree.relationships?.filter(
        (r) => r.memberId1 !== memberId && r.memberId2 !== memberId
      ) || [];
      return { currentTree: { ...state.currentTree, members, relationships } };
    }),

  clearError: () => set({ error: null }),

  reset: () => set({ trees: [], currentTree: null, isLoading: false, error: null }),
}));
