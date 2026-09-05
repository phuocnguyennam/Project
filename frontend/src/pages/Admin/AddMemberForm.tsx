import { useState } from 'react';
import { Form, Input, Button, Select, DatePicker, Card, Typography, Space, Divider, Alert, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useTree } from '@/hooks/useTree';
import { addMember } from '@/services/member.service';
import { PhotoUpload } from '@/components/Common/PhotoUpload';
import { ROUTES, RELATIONSHIP_LABELS, GENDER_LABELS } from '@/utils/constants';
import type { AddMemberPayload } from '@/types';

const { Title, Text } = Typography;

export function AddMemberForm() {
  const { id: treeId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTree } = useTree(treeId);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ username: string; tempPassword: string } | null>(null);

  const members = currentTree?.members || [];
  const isFirstMember = members.length === 0;

  const handleSubmit = async (values: AddMemberPayload & { birthDate?: { format: (fmt: string) => string } }) => {
    setLoading(true);
    setError(null);
    try {
      const payload: AddMemberPayload = {
        name: values.name,
        gender: values.gender,
        birthDate: values.birthDate ? (values.birthDate as { format: (fmt: string) => string }).format('YYYY-MM-DD') : undefined,
        phone: values.phone,
        occupation: values.occupation,
        address: values.address,
        bio: values.bio,
        relatedMemberId: values.relatedMemberId,
        relationshipType: values.relationshipType,
        cognitoUsername: values.cognitoUsername,
        tempPassword: values.tempPassword,
      };

      const result = await addMember(treeId, payload);
      setNewMemberId(result.memberId);

      if (result.credentials) {
        setCredentials({
          username: result.credentials.username,
          tempPassword: result.credentials.tempPassword,
        });
      } else {
        // Không có credentials → điều hướng ngay
        void message.success(`Đã thêm ${result.name} vào gia phả`);
        navigate(ROUTES.ADMIN_TREE(treeId));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể thêm thành viên');
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị credentials sau khi tạo thành công
  if (credentials && newMemberId) {
    return (
      <Card style={{ maxWidth: 500, margin: '0 auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Thêm thành viên thành công!"
            description="Hãy chia sẻ thông tin đăng nhập bên dưới cho thành viên."
            type="success"
            showIcon
          />
          <Alert
            message="Thông tin đăng nhập"
            description={
              <div>
                <Text>Username: </Text><Text copyable strong>{credentials.username}</Text><br />
                <Text>Mật khẩu tạm: </Text><Text copyable strong>{credentials.tempPassword}</Text><br />
                <Text type="secondary">Thành viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.</Text>
              </div>
            }
            type="info"
            showIcon
          />

          {/* Upload ảnh sau khi có memberId */}
          <div>
            <Text strong>Ảnh đại diện (tùy chọn)</Text>
            <div style={{ marginTop: 8 }}>
              <PhotoUpload treeId={treeId} memberId={newMemberId} />
            </div>
          </div>

          <Button type="primary" onClick={() => navigate(ROUTES.ADMIN_TREE(treeId))} block>
            Quay lại Quản lý Gia Phả
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <div>
      <Title level={3}>Thêm thành viên mới</Title>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Divider orientation="left">Thông tin cá nhân</Divider>

          <Space style={{ width: '100%' }} direction="vertical">
            <Space style={{ width: '100%' }}>
              <Form.Item
                name="name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
              <Form.Item
                name="gender"
                label="Giới tính"
                rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}
                style={{ width: 120 }}
              >
                <Select options={Object.entries(GENDER_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }}>
              <Form.Item name="birthDate" label="Ngày sinh" style={{ flex: 1 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
              <Form.Item name="phone" label="Điện thoại" style={{ flex: 1 }}>
                <Input placeholder="0912 345 678" />
              </Form.Item>
            </Space>

            <Form.Item name="occupation" label="Nghề nghiệp">
              <Input placeholder="Kỹ sư, Giáo viên, Nông dân..." />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ hiện tại">
              <Input placeholder="Phường, Quận, Tỉnh/Thành phố" />
            </Form.Item>
            <Form.Item name="bio" label="Ghi chú / Tiểu sử">
              <Input.TextArea rows={3} placeholder="Ghi chú hoặc tiểu sử ngắn..." />
            </Form.Item>
          </Space>

          {!isFirstMember && (
            <>
              <Divider orientation="left">Quan hệ trong gia phả</Divider>
              <Space style={{ width: '100%' }}>
                <Form.Item
                  name="relatedMemberId"
                  label="Liên quan đến"
                  rules={[{ required: true, message: 'Vui lòng chọn thành viên liên quan' }]}
                  style={{ flex: 1 }}
                >
                  <Select
                    showSearch
                    placeholder="Chọn thành viên..."
                    options={members.map((m) => ({ value: m.memberId, label: `${m.name} (Đời ${m.generation})` }))}
                    filterOption={(input, option) =>
                      (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="relationshipType"
                  label="Quan hệ"
                  rules={[{ required: true, message: 'Vui lòng chọn loại quan hệ' }]}
                  style={{ width: 160 }}
                >
                  <Select
                    options={Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                    placeholder="Chọn..."
                  />
                </Form.Item>
              </Space>
            </>
          )}

          <Divider orientation="left">Tài khoản đăng nhập (tùy chọn)</Divider>
          <Alert
            message="Điền thông tin bên dưới để tạo tài khoản cho thành viên. Sau đó chia sẻ thông tin này cho họ."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Space style={{ width: '100%' }}>
            <Form.Item name="cognitoUsername" label="Username (dạng email)" style={{ flex: 1 }}>
              <Input placeholder="vd: nguyenvana@giapha" />
            </Form.Item>
            <Form.Item name="tempPassword" label="Mật khẩu tạm thời" style={{ flex: 1 }}>
              <Input.Password placeholder="Tối thiểu 8 ký tự" />
            </Form.Item>
          </Space>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Thêm thành viên
            </Button>
            <Button onClick={() => navigate(ROUTES.ADMIN_TREE(treeId))}>Hủy</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
