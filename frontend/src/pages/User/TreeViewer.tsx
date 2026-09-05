import { useState } from 'react';
import { Input, Spin, Typography, Space, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useTree } from '@/hooks/useTree';
import { useAuthStore } from '@/store/auth.store';
import { FamilyTreeViewer } from '@/components/FamilyTree/FamilyTreeViewer';
import { MemberDetailModal } from '@/components/FamilyTree/MemberDetailModal';
import { searchMembers } from '@/services/member.service';
import type { Member } from '@/types';

const { Title, Text } = Typography;

export function TreeViewer() {
  const { id: treeId = '' } = useParams<{ id: string }>();
  const { currentTree, isLoading } = useTree(treeId);
  const { user } = useAuthStore();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  // Tìm member hiện tại của user trong tree này
  const myMember = currentTree?.members?.find(
    (m) => m.cognitoUsername === user?.username
  );

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    try {
      const { results } = await searchMembers(treeId, searchQuery);
      setHighlightedIds(results.map((m) => m.memberId));
    } catch {
      // ignore
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!currentTree) return <Text type="danger">Không tìm thấy gia phả</Text>;

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0 }}>{currentTree.name}</Title>
        {myMember && (
          <Tag color="green" icon={<SearchOutlined />}>
            Vị trí của bạn: {myMember.name} — Đời {myMember.generation}
          </Tag>
        )}
      </Space>

      <Input.Search
        placeholder="Tìm thành viên trong cây..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) setHighlightedIds([]); }}
        onSearch={handleSearch}
        enterButton
        allowClear
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      <FamilyTreeViewer
        members={currentTree.members || []}
        relationships={currentTree.relationships || []}
        highlightedMemberId={highlightedIds.length > 0 ? highlightedIds[0] : myMember?.memberId}
        onMemberClick={handleMemberClick}
        readOnly
      />

      <MemberDetailModal
        member={selectedMember}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
