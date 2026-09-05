import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/utils/constants';

interface PrivateRouteProps {
  requiredRole?: 'admin' | 'user';
}

/**
 * Route guard: kiểm tra authentication và role.
 * Nếu chưa đăng nhập → redirect /login
 * Nếu sai role → redirect về dashboard phù hợp
 */
export function PrivateRoute({ requiredRole }: PrivateRouteProps) {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (requiredRole === 'admin' && !isAdmin()) {
    return <Navigate to={ROUTES.USER_DASHBOARD} replace />;
  }

  if (requiredRole === 'user' && isAdmin()) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  return <Outlet />;
}
