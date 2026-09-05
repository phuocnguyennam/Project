import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as memberService from '../member.service';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
}));

import api from '../api';

describe('member.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addMember calls POST /trees/:id/members', async () => {
    const mockMember = { memberId: 'm1', name: 'Test', gender: 'MALE', generation: 1 };
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockMember });
    const result = await memberService.addMember('tree1', { name: 'Test', gender: 'MALE' } as any);
    expect(api.post).toHaveBeenCalledWith('/trees/tree1/members', { name: 'Test', gender: 'MALE' });
    expect(result).toEqual(mockMember);
  });

  it('updateMember calls PUT /trees/:treeId/members/:memberId', async () => {
    const mockMember = { memberId: 'm1', name: 'Updated' };
    (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockMember });
    const result = await memberService.updateMember('tree1', 'm1', { name: 'Updated' } as any);
    expect(api.put).toHaveBeenCalledWith('/trees/tree1/members/m1', { name: 'Updated' });
    expect(result).toEqual(mockMember);
  });

  it('deleteMember calls DELETE /trees/:treeId/members/:memberId', async () => {
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined });
    await memberService.deleteMember('tree1', 'm1');
    expect(api.delete).toHaveBeenCalledWith('/trees/tree1/members/m1');
  });

  it('getPresignedPhotoUrl with default fileType', async () => {
    const mockData = { uploadUrl: 'https://s3.example.com/upload', photoKey: 'photos/t1/m1.jpg', expiresIn: 3600 };
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockData });
    const result = await memberService.getPresignedPhotoUrl('t1', 'm1');
    expect(api.post).toHaveBeenCalledWith('/trees/t1/members/m1/photo-url', { fileType: 'image/jpeg' });
    expect(result).toEqual(mockData);
  });

  it('getPresignedPhotoUrl with custom fileType', async () => {
    const mockData = { uploadUrl: 'https://s3.example.com/upload', photoKey: 'photos/t1/m1.jpg', expiresIn: 3600 };
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockData });
    await memberService.getPresignedPhotoUrl('t1', 'm1', 'image/png');
    expect(api.post).toHaveBeenCalledWith('/trees/t1/members/m1/photo-url', { fileType: 'image/png' });
  });

  it('searchMembers calls GET with query params', async () => {
    const mockData = { query: 'nguyen', results: [], count: 0 };
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockData });
    const result = await memberService.searchMembers('tree1', 'nguyen');
    expect(api.get).toHaveBeenCalledWith('/trees/tree1/members/search', { params: { q: 'nguyen' } });
    expect(result).toEqual(mockData);
  });
});
