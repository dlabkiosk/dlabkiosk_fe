import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';

export interface AdminUser {
  id: number;
  loginId: string;
  name: string;
  role: string;
  storeId: number;
  storeName: string;
}

export interface CreateUserBody {
  loginId: string;
  password: string;
  name: string;
  storeId: number;
  role: 'MANAGER' | 'ADMIN';
}

export interface UpdateUserBody {
  name?: string | null;
  password?: string | null;
  storeId?: number | null;
  role?: 'MANAGER' | 'ADMIN' | null;
}

/** 계정 목록 조회 */
export function getUsers(): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>('/api/v1/admin/users');
}

/** 계정 상세 조회 */
export function getUser(id: number): Promise<AdminUser> {
  return apiGet<AdminUser>(`/api/v1/admin/users/${id}`);
}

/** 계정 등록 */
export function createUser(body: CreateUserBody): Promise<AdminUser> {
  return apiPost<AdminUser>('/api/v1/admin/users', body as unknown as Record<string, unknown>);
}

/** 계정 정보 수정 (null인 필드는 변경하지 않음) */
export function updateUser(id: number, body: UpdateUserBody): Promise<AdminUser> {
  return apiPut<AdminUser>(`/api/v1/admin/users/${id}`, body as unknown as Record<string, unknown>);
}

/** 역할 변경 (MANAGER ↔ ADMIN) */
export function changeUserRole(id: number, role: 'MANAGER' | 'ADMIN'): Promise<AdminUser> {
  return apiPatch<AdminUser>(`/api/v1/admin/users/${id}/role`, { role });
}

/** 계정 삭제 */
export function deleteUser(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/users/${id}`);
}
