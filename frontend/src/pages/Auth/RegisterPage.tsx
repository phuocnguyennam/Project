import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Steps } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { register, confirmRegistration } from '@/services/auth.service';
import { ROUTES } from '@/utils/constants';

const { Title, Text } = Typography;

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ConfirmFormValues {
  code: string;
}

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await register(values.email, values.password, values.name);
      setRegisteredEmail(values.email);
      setStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại';
      setError(msg.includes('UsernameExistsException') ? 'Email này đã được đăng ký' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (values: ConfirmFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await confirmRegistration(registeredEmail, values.code);
      setStep(2);
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xác thực thất bại';
      setError(msg.includes('CodeMismatchException') ? 'Mã xác thực không đúng' : msg);
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
      <Card style={{ width: '100%', maxWidth: 480 }} variant="borderless">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>🌳 Đăng ký Admin</Title>
            <Text type="secondary">Tạo tài khoản quản trị viên mới</Text>
          </div>

          <Steps
            current={step}
            items={[
              { title: 'Thông tin' },
              { title: 'Xác thực email' },
              { title: 'Hoàn tất' },
            ]}
          />

          {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

          {step === 0 && (
            <Form layout="vertical" onFinish={handleRegister} size="large">
              <Form.Item
                name="name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="admin@example.com" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Đăng ký
              </Button>
            </Form>
          )}

          {step === 1 && (
            <Form layout="vertical" onFinish={handleConfirm} size="large">
              <Alert
                message={`Mã xác thực đã được gửi đến ${registeredEmail}`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                name="code"
                label="Mã xác thực"
                rules={[{ required: true, message: 'Vui lòng nhập mã xác thực' }]}
              >
                <Input placeholder="123456" maxLength={6} style={{ letterSpacing: 4, textAlign: 'center' }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Xác thực
              </Button>
            </Form>
          )}

          {step === 2 && (
            <Alert
              message="Đăng ký thành công!"
              description="Tài khoản của bạn đã được xác thực. Đang chuyển hướng đến trang đăng nhập..."
              type="success"
              showIcon
            />
          )}

          {step === 0 && (
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Đã có tài khoản? </Text>
              <Link to={ROUTES.LOGIN}>Đăng nhập</Link>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}
