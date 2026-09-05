import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../auth.service';
import { signIn, signUp, confirmSignUp, signOut, confirmSignIn, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  confirmSignUp: vi.fn(),
  signOut: vi.fn(),
  confirmSignIn: vi.fn(),
  fetchAuthSession: vi.fn(),
  fetchUserAttributes: vi.fn(),
}));

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('returns NEW_PASSWORD_REQUIRED challenge', async () => {
      vi.mocked(signIn).mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' },
      } as any);

      const result = await authService.login('test@test.com', 'password');
      expect(result).toEqual({ challengeName: 'NEW_PASSWORD_REQUIRED' });
    });

    it('returns user on success', async () => {
      vi.mocked(signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(fetchAuthSession).mockResolvedValue({
        tokens: { idToken: { payload: { 'cognito:groups': ['user'], sub: '123' }, toString: () => '' } },
      } as any);
      vi.mocked(fetchUserAttributes).mockResolvedValue({ email: 'test@test.com' });

      const result = await authService.login('test@test.com', 'password');
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@test.com');
    });

    it('throws error on failure', async () => {
      vi.mocked(signIn).mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: 'DONE' },
      } as any);

      await expect(authService.login('test@test.com', 'password')).rejects.toThrow('Đăng nhập thất bại');
    });
  });

  describe('completeNewPassword', () => {
    it('returns user on success', async () => {
      vi.mocked(confirmSignIn).mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } } as any);
      vi.mocked(fetchAuthSession).mockResolvedValue({
        tokens: { idToken: { payload: {}, toString: () => '' } },
      } as any);
      vi.mocked(fetchUserAttributes).mockResolvedValue({ email: 'test@test.com' });

      const result = await authService.completeNewPassword('newpass');
      expect(result.email).toBe('test@test.com');
    });

    it('throws error on failure', async () => {
      vi.mocked(confirmSignIn).mockResolvedValue({ isSignedIn: false, nextStep: { signInStep: 'DONE' } } as any);
      await expect(authService.completeNewPassword('newpass')).rejects.toThrow('Không thể đổi mật khẩu');
    });
  });

  describe('register', () => {
    it('calls signUp with correct params', async () => {
      await authService.register('test@test.com', 'pass', 'Name');
      expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
        username: 'test@test.com',
        options: { userAttributes: { email: 'test@test.com', name: 'Name' } }
      }));
    });
  });

  describe('confirmRegistration', () => {
    it('calls confirmSignUp', async () => {
      await authService.confirmRegistration('test@test.com', '123456');
      expect(confirmSignUp).toHaveBeenCalledWith({ username: 'test@test.com', confirmationCode: '123456' });
    });
  });

  describe('logout', () => {
    it('calls signOut', async () => {
      await authService.logout();
      expect(signOut).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('parses tokens and attributes', async () => {
      vi.mocked(fetchAuthSession).mockResolvedValue({
        tokens: { idToken: { payload: { 'cognito:groups': ['admin'], sub: 'sub-123', 'cognito:username': 'user1' }, toString: () => '' } },
      } as any);
      vi.mocked(fetchUserAttributes).mockResolvedValue({ email: 'test@test.com' });

      const user = await authService.getCurrentUser();
      expect(user).toEqual({
        username: 'user1',
        email: 'test@test.com',
        sub: 'sub-123',
        groups: ['admin'],
      });
    });
  });

  describe('checkSession', () => {
    it('returns user if token exists', async () => {
      vi.mocked(fetchAuthSession).mockResolvedValue({
        tokens: { idToken: { payload: {}, toString: () => 'token' } },
      } as any);
      vi.mocked(fetchUserAttributes).mockResolvedValue({ email: 'test@test.com' });

      const user = await authService.checkSession();
      expect(user?.email).toBe('test@test.com');
    });

    it('returns null if no token', async () => {
      vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: {} } as any);
      const user = await authService.checkSession();
      expect(user).toBeNull();
    });

    it('returns null on error', async () => {
      vi.mocked(fetchAuthSession).mockRejectedValue(new Error('no session'));
      const user = await authService.checkSession();
      expect(user).toBeNull();
    });
  });
});
