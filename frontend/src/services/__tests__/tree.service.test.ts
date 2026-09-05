import { describe, it, expect, vi } from 'vitest';
import * as treeService from '../tree.service';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('tree service', () => {
  it('getTrees', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { trees: [], count: 0 } });
    const result = await treeService.getTrees();
    expect(result).toEqual({ trees: [], count: 0 });
    expect(api.get).toHaveBeenCalledWith('/trees');
  });

  it('getTree', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { treeId: '1' } });
    const result = await treeService.getTree('1');
    expect(result).toEqual({ treeId: '1' });
    expect(api.get).toHaveBeenCalledWith('/trees/1');
  });

  it('createTree', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { treeId: '1' } });
    const result = await treeService.createTree({ name: 'Tree 1', description: 'Desc' } as any);
    expect(result).toEqual({ treeId: '1' });
    expect(api.post).toHaveBeenCalledWith('/trees', { name: 'Tree 1', description: 'Desc' });
  });

  it('updateTree', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { treeId: '1' } });
    const result = await treeService.updateTree('1', { name: 'Tree 2' } as any);
    expect(result).toEqual({ treeId: '1' });
    expect(api.put).toHaveBeenCalledWith('/trees/1', { name: 'Tree 2' });
  });

  it('deleteTree', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    await treeService.deleteTree('1');
    expect(api.delete).toHaveBeenCalledWith('/trees/1');
  });
});
