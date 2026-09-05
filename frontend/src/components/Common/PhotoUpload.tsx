import { useState } from 'react';
import { Upload, message } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import axios from 'axios';
import { getPresignedPhotoUrl } from '@/services/member.service';
import { getPhotoUrl } from '@/utils/helpers';

interface PhotoUploadProps {
  treeId: string;
  memberId: string;
  currentPhotoKey?: string;
  onUploadSuccess?: (photoKey: string) => void;
}

/**
 * Upload ảnh thành viên trực tiếp lên S3 qua presigned URL.
 * Không upload qua Lambda — nhanh hơn và tiết kiệm Lambda execution time.
 */
export function PhotoUpload({ treeId, memberId, currentPhotoKey, onUploadSuccess }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState(currentPhotoKey);

  const handleUpload = async (file: File): Promise<boolean> => {
    setUploading(true);
    try {
      // 1. Lấy presigned URL từ backend
      const { uploadUrl, photoKey: newKey } = await getPresignedPhotoUrl(treeId, memberId, file.type);

      // 2. Upload trực tiếp lên S3 (không qua API Gateway)
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });

      // 3. Update local state
      setPhotoKey(newKey);
      onUploadSuccess?.(newKey);
      void message.success('Tải ảnh lên thành công');
    } catch {
      void message.error('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
    return false; // Ngăn antd upload default behavior
  };

  const uploadProps: UploadProps = {
    name: 'photo',
    listType: 'picture-circle',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        void message.error('Chỉ chấp nhận file ảnh!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        void message.error('Ảnh phải nhỏ hơn 5MB!');
        return false;
      }
      void handleUpload(file);
      return false;
    },
  };

  const photoUrl = getPhotoUrl(photoKey);

  return (
    <Upload {...uploadProps}>
      {photoUrl ? (
        <img src={photoUrl} alt="avatar" style={{ width: '100%', borderRadius: '50%' }} />
      ) : (
        <div>
          {uploading ? <LoadingOutlined /> : <PlusOutlined />}
          <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
        </div>
      )}
    </Upload>
  );
}
