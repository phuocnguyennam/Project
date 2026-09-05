import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../auth.store';

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true });
  });

  it('initial state is correct', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('setUser updates user, isAuthenticated, and isLoading', () => {
    const user = { username: 'admin', email: 'a@e.com', sub: 's1', groups: ['admin'] };
    useAuthStore.getState().setUser(user);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('clearUser resets to defaults', () => {
    const user = { username: 'admin', email: 'a@e.com', sub: 's1', groups: ['admin'] };
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().clearUser();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('setLoading only changes isLoading', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('isAdmin returns true for admin group', () => {
    useAuthStore.getState().setUser({ username: 'a', email: 'a@e.com', sub: 's1', groups: ['admin'] });
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it('isAdmin returns false for non-admin user', () => {
    useAuthStore.getState().setUser({ username: 'u', email: 'u@e.com', sub: 's2', groups: ['user'] });
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('isUser returns true for user group', () => {
    useAuthStore.getState().setUser({ username: 'u', email: 'u@e.com', sub: 's2', groups: ['user'] });
    expect(useAuthStore.getState().isUser()).toBe(true);
  });

  it('isAdmin returns false when user is null', () => {
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });
});
