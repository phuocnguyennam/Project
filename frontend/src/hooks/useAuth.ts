import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { checkSession } from '@/services/auth.service';

/**
 * Hook để access auth state và khởi tạo session khi app load.
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, isAdmin, isUser, setUser, clearUser, setLoading } =
    useAuthStore();

  useEffect(() => {
    // Khởi tạo: kiểm tra Amplify session khi app load
    setLoading(true);
    checkSession()
      .then((user) => {
        if (user) {
          setUser(user);
        } else {
          clearUser();
        }
      })
      .catch(() => clearUser());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin: isAdmin(),
    isUser: isUser(),
    setUser,
    clearUser,
  };
}
