import { apiGet, apiPost, apiPut, apiDelete } from './client';

/* ── 타입 ── */

export interface Store {
  id: number;
  storeName: string;
  storeCode: string;
  address: string;
  phone: string;
  active: boolean;
  dsaConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreRequest {
  storeName: string;
  storeCode: string;
  address: string;
  phone: string;
  kioskPin: string;
  dsaAcadCd: string;
  dsaClientId: string;
  dsaSecretId: string;
}

export interface UpdateStoreRequest {
  storeName: string;
  address: string;
  phone: string;
  active: boolean;
  kioskPin: string;
  dsaAcadCd: string;
  dsaClientId: string;
  dsaSecretId: string;
}

/* ── API ── */

/** 지점 목록 조회 (ADMIN: 전체, MANAGER: 소속 지점) */
export function getStores(): Promise<Store[]> {
  return apiGet<Store[]>('/api/v1/admin/stores');
}

/** 지점 단건 조회 */
export function getStore(storeId: number): Promise<Store> {
  return apiGet<Store>(`/api/v1/admin/stores/${storeId}`);
}

/** 지점 등록 */
export function createStore(data: CreateStoreRequest): Promise<Store> {
  return apiPost<Store>('/api/v1/admin/stores', data as unknown as Record<string, unknown>);
}

/** 지점 수정 */
export function updateStore(storeId: number, data: UpdateStoreRequest): Promise<Store> {
  return apiPut<Store>(`/api/v1/admin/stores/${storeId}`, data as unknown as Record<string, unknown>);
}

/** 지점 삭제 */
export function deleteStore(storeId: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/stores/${storeId}`);
}
