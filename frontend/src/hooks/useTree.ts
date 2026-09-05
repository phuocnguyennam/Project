import { useEffect } from 'react';
import { useTreeStore } from '@/store/tree.store';

export function useTree(treeId?: string) {
  const store = useTreeStore();

  useEffect(() => {
    if (treeId) {
      void store.fetchTree(treeId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId]);

  return store;
}

export function useTrees() {
  const store = useTreeStore();

  useEffect(() => {
    void store.fetchTrees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
