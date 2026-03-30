import { apiPost } from './client';

/* ── 타입 ── */

export interface StudentSyncResult {
  storeId: number;
  storeName: string;
  totalFromDsa: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: string[];
}

export interface StoreSyncResult {
  totalFromDsa: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

/* ── API ── */

/**
 * DSA 3.20 getStdInfoList를 호출하여 학생 데이터를 동기화합니다.
 * storeId 미지정 시 ADMIN은 전체 지점, MANAGER는 자기 지점만 동기화합니다.
 */
export function syncStudents(storeId?: number): Promise<StudentSyncResult[]> {
  return apiPost<StudentSyncResult[]>(
    '/api/v1/admin/sync/students',
    storeId != null ? { storeId } : undefined,
  );
}

/**
 * DSA 3.19 getDlabList를 호출하여 지점 데이터를 동기화합니다.
 * 기존 지점은 이름을 업데이트하고, 새 지점은 자동 생성합니다.
 */
export function syncStores(): Promise<StoreSyncResult> {
  return apiPost<StoreSyncResult>('/api/v1/admin/sync/stores');
}
