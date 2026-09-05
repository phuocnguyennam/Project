import { useState } from 'react';
import { Button, Col, Input, Row, Space, Typography, List, Avatar, Popconfirm, message, Spin, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTree } from '@/hooks/useTree';
import { deleteMember, searchMembers } from '@/services/member.service';
import { FamilyTreeViewer } from '@/components/FamilyTree/FamilyTreeViewer';
import { MemberDetailModal } from '@/components/FamilyTree/MemberDetailModal';
import { ROUTES } from '@/utils/constants';
import { getPhotoUrl, getAvatarColor, getInitials } from '@/utils/helpers';
import type { Member } from '@/types';

const { Title, Text } = Typography;

export function TreeManager() {
  const { id: treeId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTree, isLoading, removeMemberFromTree } = useTree(treeId);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[] | null>(null);
  const [searching, setSearching] = useState(false);

  const displayMembers = searchResults ?? (currentTree?.members || []);

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const { results } = await searchMembers(treeId, searchQuery);
      setSearchResults(results);
    } catch {
      void message.error('Không thể tìm kiếm');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleDeleteMember = async (member: Member) => {
    try {
      await deleteMember(treeId, member.memberId);
      removeMemberFromTree(member.memberId);
      void message.success(`Đã xóa ${member.name}`);
    } catch {
      void message.error('Không thể xóa thành viên');
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!currentTree) return <Text type="danger">Không tìm thấy gia phả</Text>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>{currentTree.name}</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(ROUTES.ADMIN_ADD_MEMBER(treeId))}
        >
          Thêm thành viên
        </Button>
      </div>

      <Row gutter={16}>
        {/* Tree Visualization */}
        <Col xs={24} lg={16}>
          <FamilyTreeViewer
            members={currentTree.members || []}
            relationships={currentTree.relationships || []}
            selectedMemberId={selectedMember?.memberId}
            onMemberClick={handleMemberClick}
          />
        </Col>

        {/* Members Panel */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.Search
              placeholder="Tìm theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              onPressEnter={handleSearch}
              enterButton={<SearchOutlined />}
              loading={searching}
              allowClear
              onClear={handleClearSearch}
            />

            {displayMembers.length === 0 ? (
              <Empty description="Chưa có thành viên" />
            ) : (
              <List
                style={{ maxHeight: 540, overflowY: 'auto' }}
                dataSource={displayMembers}
                renderItem={(member) => (
                  <List.Item
                    actions={[
                      <EditOutlined
                        key="edit"
                        onClick={() => navigate(ROUTES.ADMIN_EDIT_MEMBER(treeId, member.memberId))}
                      />,
                      <Popconfirm
                        key="delete"
                        title={`Xóa ${member.name}?`}
                        onConfirm={() => handleDeleteMember(member)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <DeleteOutlined style={{ color: '#ff4d4f' }} />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={getPhotoUrl(member.photoKey) || undefined}
                          style={{ backgroundColor: !member.photoKey ? getAvatarColor(member.name) : undefined }}
                          icon={<UserOutlined />}
                        >
                          {!member.photoKey ? getInitials(member.name) : null}
                        </Avatar>
                      }
                      title={<a onClick={() => handleMemberClick(member)}>{member.name}</a>}
                      description={`Đời ${member.generation}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Space>
        </Col>
      </Row>

      <MemberDetailModal
        member={selectedMember}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
