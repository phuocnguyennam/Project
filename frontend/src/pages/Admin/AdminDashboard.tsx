import { useState } from 'react';
import { Button, Card, Col, Empty, Form, Input, Modal, Row, Spin, Typography, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, TeamOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTrees } from '@/hooks/useTree';
import { useTreeStore } from '@/store/tree.store';
import { createTree, deleteTree } from '@/services/tree.service';
import { ROUTES } from '@/utils/constants';
import type { CreateTreePayload } from '@/types';

const { Title, Text } = Typography;

export function AdminDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { trees, isLoading, error } = useTrees();
  const { addTreeToList, removeTreeFromList } = useTreeStore();
  const [form] = Form.useForm();

  const handleCreateTree = async (values: CreateTreePayload) => {
    setCreating(true);
    try {
      const newTree = await createTree(values);
      addTreeToList(newTree);
      setModalOpen(false);
      form.resetFields();
      void message.success('Tạo gia phả thành công!');
    } catch {
      void message.error('Không thể tạo gia phả. Vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTree = async (treeId: string) => {
    try {
      await deleteTree(treeId);
      removeTreeFromList(treeId);
      void message.success('Đã xóa gia phả');
    } catch {
      void message.error('Không thể xóa gia phả');
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Quản lý Gia Phả</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Tạo gia phả mới
        </Button>
      </div>

      {error && <Text type="danger">{error}</Text>}

      {trees.length === 0 ? (
        <Empty description="Chưa có gia phả nào. Tạo gia phả đầu tiên!" />
      ) : (
        <Row gutter={[16, 16]}>
          {trees.map((tree) => (
            <Col xs={24} sm={12} lg={8} key={tree.treeId}>
              <Card
                actions={[
                  <EyeOutlined key="view" onClick={() => navigate(ROUTES.ADMIN_TREE(tree.treeId))} />,
                  <Popconfirm
                    key="delete"
                    title="Xóa gia phả?"
                    description="Tất cả thành viên sẽ bị xóa. Không thể hoàn tác."
                    onConfirm={() => handleDeleteTree(tree.treeId)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <DeleteOutlined style={{ color: '#ff4d4f' }} />
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={<TeamOutlined style={{ fontSize: 32, color: '#1677ff' }} />}
                  title={tree.name}
                  description={
                    <Space direction="vertical" size={4}>
                      {tree.description && <Text type="secondary">{tree.description}</Text>}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Tạo ngày: {new Date(tree.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="Tạo gia phả mới"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTree}>
          <Form.Item
            name="name"
            label="Tên gia phả"
            rules={[{ required: true, message: 'Vui lòng nhập tên gia phả' }]}
          >
            <Input placeholder="VD: Gia phả họ Nguyễn" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về gia phả (không bắt buộc)" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={creating}>Tạo</Button>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
