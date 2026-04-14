import { apiGet, apiPost, apiPut, apiDelete } from './client';

const BASE = '/api/v1/admin/notice-categories';

export interface NoticeCategory {
  id: number;
  storeId: number;
  name: string;
  displayOrder: number;
}

/** 말머리 목록 조회 (displayOrder 오름차순) */
export function getNoticeCategories(storeId?: number): Promise<NoticeCategory[]> {
  const query = storeId !== undefined ? `?storeId=${storeId}` : '';
  return apiGet<NoticeCategory[]>(`${BASE}${query}`);
}

/** 말머리 추가 */
export function createNoticeCategory(name: string, storeId?: number): Promise<NoticeCategory> {
  const query = storeId !== undefined ? `?storeId=${storeId}` : '';
  return apiPost<NoticeCategory>(`${BASE}${query}`, { name });
}

/** 말머리 삭제 */
export function deleteNoticeCategory(categoryId: number): Promise<string> {
  return apiDelete<string>(`${BASE}/${categoryId}`);
}

/** 말머리 순서 변경 */
export function updateNoticeCategoryOrder(orderedIds: number[], storeId?: number): Promise<NoticeCategory[]> {
  const query = storeId !== undefined ? `?storeId=${storeId}` : '';
  return apiPut<NoticeCategory[]>(`${BASE}/order${query}`, { orderedIds } as unknown as Record<string, unknown>);
}
