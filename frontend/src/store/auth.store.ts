import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Computed
  isAdmin: () => boolean;
  isUser: () => boolean;
  // Actions
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      isAdmin: () => get().user?.groups.includes('admin') ?? false,
      isUser: () => get().user?.groups.includes('user') ?? false,

      setUser: (user: AuthUser) =>
        set({ user, isAuthenticated: true, isLoading: false }),

      clearUser: () =>
        set({ user: null, isAuthenticated: false, isLoading: false }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      // Chỉ persist user info, không persist isLoading
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
