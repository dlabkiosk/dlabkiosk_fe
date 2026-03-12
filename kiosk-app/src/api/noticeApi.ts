import { apiGet } from './client';

/* ── 타입 ── */

export interface Notice {
  id: number;
  storeId: number;
  storeName: string;
  title: string;
  content: string;
  pinned: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── API ── */

/** 공지 목록 조회 */
export function getNotices(): Promise<Notice[]> {
  return apiGet<Notice[]>('/api/v1/admin/notices');
}
