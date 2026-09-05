// ==========================================
// Enums
// ==========================================

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum RelationshipType {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  SIBLING = 'SIBLING',
  SPOUSE = 'SPOUSE',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// ==========================================
// Domain Models
// ==========================================

export interface Member {
  memberId: string;
  treeId: string;
  name: string;
  gender: Gender;
  generation: number;
  birthDate?: string;
  deathDate?: string;
  phone?: string;
  occupation?: string;
  address?: string;
  bio?: string;
  photoKey?: string;
  cognitoUsername?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  memberId1: string;
  memberId2: string;
  type: RelationshipType;
}

export interface FamilyTree {
  treeId: string;
  name: string;
  description?: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
  members?: Member[];
  relationships?: Relationship[];
  role?: 'ADMIN' | 'USER';  // role của current user trong tree này
}

// ==========================================
// Auth
// ==========================================

export interface AuthUser {
  username: string;
  email: string;
  sub: string;
  groups: string[];
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ==========================================
// API
// ==========================================

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface AddMemberPayload {
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  phone?: string;
  occupation?: string;
  address?: string;
  bio?: string;
  relatedMemberId?: string;
  relationshipType?: RelationshipType;
  cognitoUsername?: string;
  tempPassword?: string;
}

export interface UpdateMemberPayload {
  name?: string;
  gender?: Gender;
  birthDate?: string;
  deathDate?: string;
  phone?: string;
  occupation?: string;
  address?: string;
  bio?: string;
}

export interface CreateTreePayload {
  name: string;
  description?: string;
}

export interface UpdateTreePayload {
  name?: string;
  description?: string;
}

// ==========================================
// d3.js Tree Visualization
// ==========================================

export interface TreeNodeData {
  id: string;
  member: Member;
  children?: TreeNodeData[];
  spouseId?: string;  // ID của người vợ/chồng (cùng hàng)
  x?: number;
  y?: number;
}

export interface TreeLinkData {
  source: TreeNodeData;
  target: TreeNodeData;
  isSpouseLink: boolean;
}

// ==========================================
// UI State
// ==========================================

export interface SearchResult {
  query: string;
  results: Member[];
  count: number;
}
