import { Modal, Descriptions, Avatar, Tag, Typography, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { Member } from '@/types';
import { formatDate, getPhotoUrl, getAvatarColor, getInitials } from '@/utils/helpers';
import { GENDER_LABELS } from '@/utils/constants';

interface MemberDetailModalProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Modal hiển thị đầy đủ thông tin của một thành viên khi click node trên cây.
 */
export function MemberDetailModal({ member, open, onClose }: MemberDetailModalProps) {
  if (!member) return null;

  const photoUrl = getPhotoUrl(member.photoKey);

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space style={{ width: '100%', justifyContent: 'center' }} direction="vertical" align="center">
          <Avatar
            size={80}
            src={photoUrl || undefined}
            style={{
              backgroundColor: !photoUrl ? getAvatarColor(member.name) : undefined,
              fontSize: 24,
            }}
            icon={!photoUrl ? undefined : <UserOutlined />}
          >
            {!photoUrl ? getInitials(member.name) : null}
          </Avatar>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {member.name}
          </Typography.Title>
          <Tag color={member.gender === 'MALE' ? 'blue' : 'pink'}>
            {GENDER_LABELS[member.gender]}
          </Tag>
        </Space>

        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Thế hệ">Đời {member.generation}</Descriptions.Item>
          {member.birthDate && (
            <Descriptions.Item label="Ngày sinh">{formatDate(member.birthDate)}</Descriptions.Item>
          )}
          {member.deathDate && (
            <Descriptions.Item label="Ngày mất">{formatDate(member.deathDate)}</Descriptions.Item>
          )}
          {member.phone && (
            <Descriptions.Item label="Điện thoại">{member.phone}</Descriptions.Item>
          )}
          {member.occupation && (
            <Descriptions.Item label="Nghề nghiệp">{member.occupation}</Descriptions.Item>
          )}
          {member.address && (
            <Descriptions.Item label="Địa chỉ">{member.address}</Descriptions.Item>
          )}
          {member.bio && (
            <Descriptions.Item label="Tiểu sử">{member.bio}</Descriptions.Item>
          )}
        </Descriptions>
      </Space>
    </Modal>
  );
}
