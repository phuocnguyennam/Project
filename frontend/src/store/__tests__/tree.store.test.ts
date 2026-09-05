import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTreeStore } from '../tree.store';
import { Gender, RelationshipType } from '@/types';

vi.mock('@/services/tree.service', () => ({
  getTrees: vi.fn(),
  getTree: vi.fn(),
}));

import * as treeService from '@/services/tree.service';

const mockTree = {
  treeId: 't1',
  name: 'Tree 1',
  adminId: 'admin',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  members: [
    { memberId: 'm1', treeId: 't1', name: 'Member 1', gender: Gender.MALE, generation: 1, createdAt: '', updatedAt: '' },
  ],
  relationships: [
    { memberId1: 'm1', memberId2: 'm2', type: RelationshipType.PARENT },
  ],
};

describe('tree.store', () => {
  beforeEach(() => {
    useTreeStore.getState().reset();
    vi.clearAllMocks();
  });

  it('initial state is correct', () => {
    const s = useTreeStore.getState();
    expect(s.trees).toEqual([]);
    expect(s.currentTree).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('fetchTrees success updates trees', async () => {
    (treeService.getTrees as ReturnType<typeof vi.fn>).mockResolvedValue({ trees: [mockTree], count: 1 });
    await useTreeStore.getState().fetchTrees();
    const s = useTreeStore.getState();
    expect(s.trees).toHaveLength(1);
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('fetchTrees error sets error message', async () => {
    (treeService.getTrees as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    await useTreeStore.getState().fetchTrees();
    const s = useTreeStore.getState();
    expect(s.error).toBe('Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch gia ph\u1ea3');
    expect(s.isLoading).toBe(false);
  });

  it('fetchTree success sets currentTree', async () => {
    (treeService.getTree as ReturnType<typeof vi.fn>).mockResolvedValue(mockTree);
    await useTreeStore.getState().fetchTree('t1');
    expect(useTreeStore.getState().currentTree).toEqual(mockTree);
  });

  it('fetchTree error sets error message', async () => {
    (treeService.getTree as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    await useTreeStore.getState().fetchTree('t1');
    expect(useTreeStore.getState().error).toBe('Kh\u00f4ng th\u1ec3 t\u1ea3i th\u00f4ng tin gia ph\u1ea3');
  });

  it('setCurrentTree sets currentTree', () => {
    useTreeStore.getState().setCurrentTree(mockTree);
    expect(useTreeStore.getState().currentTree).toEqual(mockTree);
    useTreeStore.getState().setCurrentTree(null);
    expect(useTreeStore.getState().currentTree).toBeNull();
  });

  it('addTreeToList appends tree', () => {
    useTreeStore.getState().addTreeToList(mockTree);
    expect(useTreeStore.getState().trees).toHaveLength(1);
  });

  it('updateTreeInList replaces matching tree in list', () => {
    useTreeStore.setState({ trees: [mockTree] });
    const updated = { ...mockTree, name: 'Updated' };
    useTreeStore.getState().updateTreeInList(updated);
    expect(useTreeStore.getState().trees[0].name).toBe('Updated');
  });

  it('updateTreeInList also updates currentTree if matching', () => {
    useTreeStore.setState({ trees: [mockTree], currentTree: mockTree });
    const updated = { ...mockTree, name: 'Updated' };
    useTreeStore.getState().updateTreeInList(updated);
    expect(useTreeStore.getState().currentTree?.name).toBe('Updated');
  });

  it('updateTreeInList does not update currentTree if not matching', () => {
    const otherTree = { ...mockTree, treeId: 't2' };
    useTreeStore.setState({ trees: [mockTree], currentTree: otherTree });
    const updated = { ...mockTree, name: 'Updated' };
    useTreeStore.getState().updateTreeInList(updated);
    expect(useTreeStore.getState().currentTree?.treeId).toBe('t2');
  });

  it('removeTreeFromList filters tree out', () => {
    useTreeStore.setState({ trees: [mockTree] });
    useTreeStore.getState().removeTreeFromList('t1');
    expect(useTreeStore.getState().trees).toHaveLength(0);
  });

  it('removeTreeFromList nulls currentTree if matching', () => {
    useTreeStore.setState({ trees: [mockTree], currentTree: mockTree });
    useTreeStore.getState().removeTreeFromList('t1');
    expect(useTreeStore.getState().currentTree).toBeNull();
  });

  it('updateMemberInTree replaces member', () => {
    useTreeStore.setState({ currentTree: mockTree });
    const updatedMember = { memberId: 'm1', treeId: 't1', name: 'Updated Member', gender: Gender.MALE, generation: 1, createdAt: '', updatedAt: '' };
    useTreeStore.getState().updateMemberInTree(updatedMember);
    expect(useTreeStore.getState().currentTree?.members?.[0].name).toBe('Updated Member');
  });

  it('removeMemberFromTree filters member and relationships', () => {
    useTreeStore.setState({ currentTree: mockTree });
    useTreeStore.getState().removeMemberFromTree('m1');
    const state = useTreeStore.getState();
    expect(state.currentTree?.members).toHaveLength(0);
    expect(state.currentTree?.relationships).toHaveLength(0);
  });

  it('clearError sets error to null', () => {
    useTreeStore.setState({ error: 'some error' });
    useTreeStore.getState().clearError();
    expect(useTreeStore.getState().error).toBeNull();
  });
});
