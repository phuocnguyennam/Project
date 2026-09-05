import { CLOUDFRONT_DOMAIN } from './constants';

/**
 * Format ngày tháng sang tiếng Việt: DD/MM/YYYY
 */
export function formatDate(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('vi-VN');
}

/**
 * Tạo label cho thế hệ: "Đời 1", "Đời 2", etc.
 */
export function generationLabel(generation: number): string {
  return `Đời ${generation}`;
}

/**
 * Tạo URL đầy đủ cho ảnh thành viên qua CloudFront.
 */
export function getPhotoUrl(photoKey?: string): string {
  if (!photoKey) return '';
  if (!CLOUDFRONT_DOMAIN) return '';
  return `https://${CLOUDFRONT_DOMAIN}/${photoKey}`;
}

/**
 * Lấy chữ cái đầu của tên để dùng làm avatar fallback.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || '?';
}

/**
 * Kiểm tra user có thuộc group admin không.
 */
export function isAdminUser(groups: string[]): boolean {
  return groups.includes('admin');
}

/**
 * Generate màu avatar dựa trên tên (consistent).
 */
export function getAvatarColor(name: string): string {
  const colors = [
    '#F56565', '#ED8936', '#ECC94B', '#48BB78',
    '#38B2AC', '#4299E1', '#667EEA', '#9F7AEA',
    '#ED64A6', '#FC8181',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}
