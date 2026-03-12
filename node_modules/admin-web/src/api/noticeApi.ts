import { apiGet, apiPost, apiPut, apiDelete } from './client';

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

interface CreateNoticeRequest {
  title: string;
  content: string;
  pinned: boolean;
}

interface UpdateNoticeRequest {
  title: string;
  content: string;
  pinned: boolean;
  active: boolean;
}

/* ── API ── */

/** 공지 목록 조회 (MANAGER: 자기 지점, ADMIN: 전체) */
export function getNotices(): Promise<Notice[]> {
  return apiGet<Notice[]>('/api/v1/admin/notices');
}

/** 공지 단건 조회 */
export function getNotice(noticeId: number): Promise<Notice> {
  return apiGet<Notice>(`/api/v1/admin/notices/${noticeId}`);
}

/** 공지 등록 (MANAGER: 자기 지점 자동, ADMIN: storeId 필수) */
export function createNotice(data: CreateNoticeRequest): Promise<Notice> {
  return apiPost<Notice>('/api/v1/admin/notices', data as unknown as Record<string, unknown>);
}

/** 공지 수정 */
export function updateNotice(noticeId: number, data: UpdateNoticeRequest): Promise<Notice> {
  return apiPut<Notice>(`/api/v1/admin/notices/${noticeId}`, data as unknown as Record<string, unknown>);
}

/** 공지 삭제 */
export function deleteNotice(noticeId: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/notices/${noticeId}`);
}
