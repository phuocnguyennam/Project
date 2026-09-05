import api from './api';
import type { FamilyTree, CreateTreePayload, UpdateTreePayload } from '@/types';

export async function getTrees(): Promise<{ trees: FamilyTree[]; count: number }> {
  const { data } = await api.get('/trees');
  return data;
}

export async function getTree(treeId: string): Promise<FamilyTree> {
  const { data } = await api.get(`/trees/${treeId}`);
  return data;
}

export async function createTree(payload: CreateTreePayload): Promise<FamilyTree> {
  const { data } = await api.post('/trees', payload);
  return data;
}

export async function updateTree(treeId: string, payload: UpdateTreePayload): Promise<FamilyTree> {
  const { data } = await api.put(`/trees/${treeId}`, payload);
  return data;
}

export async function deleteTree(treeId: string): Promise<void> {
  await api.delete(`/trees/${treeId}`);
}
