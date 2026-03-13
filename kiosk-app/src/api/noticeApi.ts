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

/** 해당 지점의 활성 공지 목록 조회 (고정 공지 우선, 최신순) */
export function getNotices(): Promise<Notice[]> {
  return apiGet<Notice[]>('/api/v1/kiosk/notices');
}
