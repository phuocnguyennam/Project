export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  CHANGE_PASSWORD: '/change-password',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_TREE: (id: string) => `/admin/trees/${id}`,
  ADMIN_ADD_MEMBER: (treeId: string) => `/admin/trees/${treeId}/members/add`,
  ADMIN_EDIT_MEMBER: (treeId: string, memberId: string) => `/admin/trees/${treeId}/members/${memberId}`,
  USER_DASHBOARD: '/user/dashboard',
  USER_TREE: (id: string) => `/user/trees/${id}`,
} as const;

export const GENDER_LABELS: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: 'Cha/Mẹ',
  CHILD: 'Con',
  SIBLING: 'Anh/Chị/Em',
  SPOUSE: 'Vợ/Chồng',
};

export const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL as string;
export const CLOUDFRONT_DOMAIN = import.meta.env.VITE_CLOUDFRONT_DOMAIN as string;

export const TREE_NODE_WIDTH = 160;
export const TREE_NODE_HEIGHT = 80;
export const TREE_H_GAP = 40;  // horizontal gap between nodes
export const TREE_V_GAP = 100; // vertical gap between generations
