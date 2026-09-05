import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/utils/constants';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(values.email, values.password);

      if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        navigate(ROUTES.CHANGE_PASSWORD);
        return;
      }

      if (result.user) {
        setUser(result.user);
        if (result.user.groups.includes('admin')) {
          navigate(ROUTES.ADMIN_DASHBOARD);
        } else {
          navigate(ROUTES.USER_DASHBOARD);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      if (msg.includes('NotAuthorizedException') || msg.includes('Incorrect')) {
        setError('Email hoặc mật khẩu không đúng');
      } else if (msg.includes('UserNotConfirmedException')) {
        setError('Tài khoản chưa được xác thực. Vui lòng kiểm tra email.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }} variant="borderless">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>🌳 Quản lý Gia Phả</Title>
            <Text type="secondary">Đăng nhập vào tài khoản của bạn</Text>
          </div>

          {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

          <Form layout="vertical" onFinish={handleSubmit} size="large">
            <Form.Item
              name="email"
              label="Email / Tên đăng nhập"
              rules={[{ required: true, message: 'Vui lòng nhập email' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="email@example.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Chưa có tài khoản admin? </Text>
            <Link to={ROUTES.REGISTER}>Đăng ký</Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}
