import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Switch } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { logout } from '@/services/auth.service';
import { ROUTES } from '@/utils/constants';
import { getInitials, getAvatarColor } from '@/utils/helpers';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

/**
 * Main application layout với Sider navigation và Header.
 * Tự động render menu khác nhau cho admin vs user.
 */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, clearUser } = useAuthStore();
  const { isDark, toggle } = useThemeStore();

  const isAdminUser = isAdmin();

  const adminMenuItems = [
    {
      key: ROUTES.ADMIN_DASHBOARD,
      icon: <HomeOutlined />,
      label: 'Trang chủ',
    },
    {
      key: 'trees',
      icon: <TeamOutlined />,
      label: 'Gia phả',
    },
  ];

  const userMenuItems = [
    {
      key: ROUTES.USER_DASHBOARD,
      icon: <HomeOutlined />,
      label: 'Gia phả của tôi',
    },
  ];

  const menuItems = isAdminUser ? adminMenuItems : userMenuItems;

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await logout();
    clearUser();
    navigate(ROUTES.LOGIN);
  };

  const userDropdownItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.email || 'Tài khoản',
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        breakpoint="lg"
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          {!collapsed && (
            <Text strong style={{ color: 'white', fontSize: 16 }}>
              🌳 Gia Phả
            </Text>
          )}
          {collapsed && <Text style={{ color: 'white' }}>🌳</Text>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
            gap: 16,
          }}
        >
          <Space>
            <Switch
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={isDark}
              onChange={toggle}
            />
            <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight">
              <Avatar
                style={{
                  backgroundColor: getAvatarColor(user?.email || ''),
                  cursor: 'pointer',
                }}
              >
                {getInitials(user?.email || 'U')}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
