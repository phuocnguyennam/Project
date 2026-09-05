import { Card, Avatar, Tag, Typography } from 'antd';
import type { Member } from '@/types';
import { getPhotoUrl, getAvatarColor, getInitials } from '@/utils/helpers';
import { GENDER_LABELS } from '@/utils/constants';

interface TreeNodeProps {
  member: Member;
  isHighlighted?: boolean;
  onClick?: (member: Member) => void;
}

export function TreeNode({ member, isHighlighted, onClick }: TreeNodeProps) {
  const photoUrl = getPhotoUrl(member.photoKey);

  return (
    <Card
      size="small"
      hoverable
      onClick={() => onClick?.(member)}
      style={{
        width: 180,
        border: isHighlighted ? '2px solid #52c41a' : undefined,
        boxShadow: isHighlighted ? '0 0 12px rgba(82, 196, 26, 0.4)' : undefined,
      }}
    >
      <Card.Meta
        avatar={
          <Avatar
            src={photoUrl || undefined}
            style={{ backgroundColor: !photoUrl ? getAvatarColor(member.name) : undefined }}
          >
            {!photoUrl ? getInitials(member.name) : null}
          </Avatar>
        }
        title={
          <Typography.Text ellipsis style={{ maxWidth: 120 }}>
            {member.name}
          </Typography.Text>
        }
        description={
          <>
            <Tag color={member.gender === 'MALE' ? 'blue' : 'pink'} style={{ fontSize: 10 }}>
              {GENDER_LABELS[member.gender]}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Đời {member.generation}
            </Typography.Text>
          </>
        }
      />
    </Card>
  );
}
