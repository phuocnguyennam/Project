import { useEffect, useState } from 'react';
import { Form, Input, Button, Select, DatePicker, Card, Typography, Space, Alert, message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTree } from '@/hooks/useTree';
import { updateMember } from '@/services/member.service';
import { useTreeStore } from '@/store/tree.store';
import { PhotoUpload } from '@/components/Common/PhotoUpload';
import { ROUTES, GENDER_LABELS } from '@/utils/constants';
import type { UpdateMemberPayload } from '@/types';

const { Title } = Typography;

export function EditMemberForm() {
  const { id: treeId = '', memberId = '' } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();
  const { currentTree, isLoading } = useTree(treeId);
  const { updateMemberInTree } = useTreeStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const member = currentTree?.members?.find((m) => m.memberId === memberId);

  useEffect(() => {
    if (member) {
      form.setFieldsValue({
        name: member.name,
        gender: member.gender,
        birthDate: member.birthDate ? dayjs(member.birthDate) : undefined,
        phone: member.phone,
        occupation: member.occupation,
        address: member.address,
        bio: member.bio,
      });
    }
  }, [member, form]);

  const handleSubmit = async (values: UpdateMemberPayload & { birthDate?: { format: (fmt: string) => string } }) => {
    setLoading(true);
    setError(null);
    try {
      const payload: UpdateMemberPayload = {
        ...values,
        birthDate: values.birthDate ? (values.birthDate as { format: (fmt: string) => string }).format('YYYY-MM-DD') : undefined,
      };
      const updated = await updateMember(treeId, memberId, payload);
      updateMemberInTree(updated);
      void message.success('Cập nhật thông tin thành công');
      navigate(ROUTES.ADMIN_TREE(treeId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!member) return <Typography.Text type="danger">Không tìm thấy thành viên</Typography.Text>;

  return (
    <div>
      <Title level={3}>Sửa thông tin — {member.name}</Title>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space style={{ width: '100%' }}>
            <Form.Item name="name" label="Họ và tên" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="Giới tính" style={{ width: 120 }}>
              <Select options={Object.entries(GENDER_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }}>
            <Form.Item name="birthDate" label="Ngày sinh" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="phone" label="Điện thoại" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="occupation" label="Nghề nghiệp">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ hiện tại">
            <Input />
          </Form.Item>
          <Form.Item name="bio" label="Ghi chú / Tiểu sử">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item label="Ảnh đại diện">
            <PhotoUpload treeId={treeId} memberId={memberId} currentPhotoKey={member.photoKey} />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>Lưu thay đổi</Button>
            <Button onClick={() => navigate(ROUTES.ADMIN_TREE(treeId))}>Hủy</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
