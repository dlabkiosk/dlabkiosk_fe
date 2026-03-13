import { apiGet, apiPost } from './client';

/* ── 타입 ── */

export interface StoreInfo {
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

export interface KioskSession {
  storeId: number;
  storeName: string;
  storeCode: string;
}

/* ── API ── */

/** 지점 코드로 지점 정보 조회 */
export function getStoreByCode(storeCode: string): Promise<StoreInfo> {
  return apiGet<StoreInfo>(`/api/v1/stores/${storeCode}`);
}

/** 키오스크 로그인 (지점코드 + PIN) */
export function kioskLogin(storeCode: string, kioskPin: string): Promise<KioskSession> {
  return apiPost<KioskSession>('/api/v1/kiosk/auth/login', { storeCode, kioskPin });
}

/** 키오스크 로그아웃 */
export function kioskLogout(): Promise<string> {
  return apiPost<string>('/api/v1/kiosk/auth/logout');
}

/** 현재 로그인된 키오스크 세션 조회 (새로고침 시 복구용) */
export function kioskMe(): Promise<KioskSession> {
  return apiGet<KioskSession>('/api/v1/kiosk/auth/me');
}
