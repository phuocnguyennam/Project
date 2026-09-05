import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { completeNewPassword } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/utils/constants';

const { Title, Text } = Typography;

export function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleSubmit = async ({ newPassword }: { newPassword: string }) => {
    setLoading(true);
    setError(null);
    try {
      const user = await completeNewPassword(newPassword);
      setUser(user);
      if (user.groups.includes('admin')) {
        navigate(ROUTES.ADMIN_DASHBOARD);
      } else {
        navigate(ROUTES.USER_DASHBOARD);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể đổi mật khẩu');
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
            <Title level={3}>Đổi mật khẩu</Title>
            <Text type="secondary">Đây là lần đăng nhập đầu tiên. Vui lòng đặt mật khẩu mới.</Text>
          </div>

          {error && <Alert message={error} type="error" showIcon />}

          <Form layout="vertical" onFinish={handleSubmit} size="large">
            <Form.Item
              name="newPassword"
              label="Mật khẩu mới"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Xác nhận đổi mật khẩu
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
