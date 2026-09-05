import { Card, Col, Empty, Row, Spin, Typography, Space } from 'antd';
import { EyeOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTrees } from '@/hooks/useTree';
import { ROUTES } from '@/utils/constants';

const { Title, Text } = Typography;

export function UserDashboard() {
  const navigate = useNavigate();
  const { trees, isLoading, error } = useTrees();

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <Title level={2}>Gia Phả của tôi</Title>
      {error && <Text type="danger">{error}</Text>}

      {trees.length === 0 ? (
        <Empty description="Bạn chưa được thêm vào gia phả nào. Liên hệ quản trị viên để được thêm vào." />
      ) : (
        <Row gutter={[16, 16]}>
          {trees.map((tree) => (
            <Col xs={24} sm={12} lg={8} key={tree.treeId}>
              <Card
                hoverable
                onClick={() => navigate(ROUTES.USER_TREE(tree.treeId))}
                actions={[
                  <EyeOutlined key="view" onClick={() => navigate(ROUTES.USER_TREE(tree.treeId))} />,
                ]}
              >
                <Card.Meta
                  avatar={<TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />}
                  title={tree.name}
                  description={
                    <Space direction="vertical" size={4}>
                      {tree.description && <Text type="secondary">{tree.description}</Text>}
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
