import { apiGet } from './client';

/* ── 타입 ── */

export interface Notice {
  id: number;
  storeId: number;
  storeName: string;
  categoryId: number | null;
  categoryName: string | null;
  title: string;
  content: string;
  pinned: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectNotice {
  id: number;
  storeId: number;
  subjectName: string;
  title: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── API ── */

/** 해당 지점의 활성 공지 목록 조회 (고정 공지 우선, 최신순) */
export function getNotices(): Promise<Notice[]> {
  return apiGet<Notice[]>('/api/v1/kiosk/notices');
}

