import api from './api';
import type { Member, AddMemberPayload, UpdateMemberPayload, SearchResult } from '@/types';

export async function addMember(treeId: string, payload: AddMemberPayload): Promise<Member & { credentials?: { username: string; tempPassword: string; message: string } }> {
  const { data } = await api.post(`/trees/${treeId}/members`, payload);
  return data;
}

export async function updateMember(treeId: string, memberId: string, payload: UpdateMemberPayload): Promise<Member> {
  const { data } = await api.put(`/trees/${treeId}/members/${memberId}`, payload);
  return data;
}

export async function deleteMember(treeId: string, memberId: string): Promise<void> {
  await api.delete(`/trees/${treeId}/members/${memberId}`);
}

export async function getPresignedPhotoUrl(
  treeId: string,
  memberId: string,
  fileType: string = 'image/jpeg'
): Promise<{ uploadUrl: string; photoKey: string; expiresIn: number }> {
  const { data } = await api.post(`/trees/${treeId}/members/${memberId}/photo-url`, { fileType });
  return data;
}

export async function searchMembers(treeId: string, query: string): Promise<SearchResult> {
  const { data } = await api.get(`/trees/${treeId}/members/search`, { params: { q: query } });
  return data;
}
