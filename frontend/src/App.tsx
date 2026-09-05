import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { useThemeStore } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { checkSession } from '@/services/auth.service';
import { getThemeConfig } from '@/theme';
import { AppLayout } from '@/components/Layout/AppLayout';
import { PrivateRoute } from '@/components/Layout/PrivateRoute';
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';
import { LoginPage } from '@/pages/Auth/LoginPage';
import { RegisterPage } from '@/pages/Auth/RegisterPage';
import { ChangePasswordPage } from '@/pages/Auth/ChangePasswordPage';
import { AdminDashboard } from '@/pages/Admin/AdminDashboard';
import { TreeManager } from '@/pages/Admin/TreeManager';
import { AddMemberForm } from '@/pages/Admin/AddMemberForm';
import { EditMemberForm } from '@/pages/Admin/EditMemberForm';
import { UserDashboard } from '@/pages/User/UserDashboard';
import { TreeViewer } from '@/pages/User/TreeViewer';
import { ROUTES } from '@/utils/constants';

export function App() {
  const { isDark } = useThemeStore();
  const { setUser, clearUser, setLoading } = useAuthStore();

  // Khởi tạo session khi app load
  useEffect(() => {
    setLoading(true);
    checkSession()
      .then((user) => (user ? setUser(user) : clearUser()))
      .catch(() => clearUser());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ConfigProvider theme={getThemeConfig(isDark)} locale={viVN}>
      <AntApp>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
              <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />

              {/* Admin routes */}
              <Route element={<PrivateRoute requiredRole="admin" />}>
                <Route element={<AppLayout />}>
                  <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
                  <Route path="/admin/trees/:id" element={<TreeManager />} />
                  <Route path="/admin/trees/:id/members/add" element={<AddMemberForm />} />
                  <Route path="/admin/trees/:id/members/:memberId" element={<EditMemberForm />} />
                </Route>
              </Route>

              {/* User routes */}
              <Route element={<PrivateRoute requiredRole="user" />}>
                <Route element={<AppLayout />}>
                  <Route path={ROUTES.USER_DASHBOARD} element={<UserDashboard />} />
                  <Route path="/user/trees/:id" element={<TreeViewer />} />
                </Route>
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
              <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  );
}
