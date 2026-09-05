import {
  signIn,
  signUp,
  confirmSignUp,
  signOut,
  confirmSignIn,
  fetchAuthSession,
  fetchUserAttributes,
  type SignInInput,
  type SignUpInput,
} from 'aws-amplify/auth';
import type { AuthUser } from '@/types';

/**
 * Đăng nhập với email + password.
 * Trả về AuthUser nếu thành công, hoặc throw error nếu cần đổi password (NEW_PASSWORD_REQUIRED).
 */
export async function login(email: string, password: string): Promise<{ user?: AuthUser; challengeName?: string }> {
  const result = await signIn({ username: email, password } satisfies SignInInput);

  if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
    return { challengeName: 'NEW_PASSWORD_REQUIRED' };
  }

  if (result.isSignedIn) {
    const user = await getCurrentUser();
    return { user };
  }

  throw new Error('Đăng nhập thất bại');
}

/**
 * Xử lý NEW_PASSWORD_REQUIRED challenge — đổi mật khẩu lần đầu.
 */
export async function completeNewPassword(newPassword: string): Promise<AuthUser> {
  const result = await confirmSignIn({ challengeResponse: newPassword });
  if (result.isSignedIn) {
    return await getCurrentUser();
  }
  throw new Error('Không thể đổi mật khẩu');
}

/**
 * Đăng ký admin mới với email thật.
 */
export async function register(email: string, password: string, name: string): Promise<void> {
  await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name,
      },
    },
  } satisfies SignUpInput);
}

/**
 * Xác thực email sau khi đăng ký.
 */
export async function confirmRegistration(email: string, code: string): Promise<void> {
  await confirmSignUp({ username: email, confirmationCode: code });
}

/**
 * Đăng xuất.
 */
export async function logout(): Promise<void> {
  await signOut();
}

/**
 * Lấy thông tin user hiện tại từ Amplify session.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const [session, attributes] = await Promise.all([
    fetchAuthSession(),
    fetchUserAttributes(),
  ]);

  const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) || [];
  const sub = (session.tokens?.idToken?.payload['sub'] as string) || '';
  const username = (session.tokens?.idToken?.payload['cognito:username'] as string)
    || attributes.email
    || '';

  return {
    username,
    email: attributes.email || '',
    sub,
    groups,
  };
}

/**
 * Kiểm tra xem có session hợp lệ không.
 */
export async function checkSession(): Promise<AuthUser | null> {
  try {
    const session = await fetchAuthSession();
    if (session.tokens?.idToken) {
      return await getCurrentUser();
    }
    return null;
  } catch {
    return null;
  }
}
