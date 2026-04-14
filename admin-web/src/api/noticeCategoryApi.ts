const BASE = '/api/v1/admin/notice-categories';

export interface NoticeCategory {
  id: number;
  storeId: number;
  name: string;
  displayOrder: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
}

/** 말머리 목록 조회 (displayOrder 오름차순) */
export async function getNoticeCategories(storeId?: number): Promise<NoticeCategory[]> {
  const params = new URLSearchParams();
  if (storeId !== undefined) params.append('storeId', String(storeId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE}${query}`, { credentials: 'include' });
  const json: ApiResponse<NoticeCategory[]> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '말머리 조회 실패');
  return json.data;
}

/** 말머리 추가 */
export async function createNoticeCategory(name: string, storeId?: number): Promise<NoticeCategory> {
  const params = new URLSearchParams();
  if (storeId !== undefined) params.append('storeId', String(storeId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE}${query}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json: ApiResponse<NoticeCategory> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '말머리 추가 실패');
  return json.data;
}

/** 말머리 삭제 */
export async function deleteNoticeCategory(categoryId: number): Promise<void> {
  const res = await fetch(`${BASE}/${categoryId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json: ApiResponse<string> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '말머리 삭제 실패');
}

/** 말머리 순서 변경 */
export async function updateNoticeCategoryOrder(orderedIds: number[], storeId?: number): Promise<NoticeCategory[]> {
  const params = new URLSearchParams();
  if (storeId !== undefined) params.append('storeId', String(storeId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE}/order${query}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  const json: ApiResponse<NoticeCategory[]> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '말머리 순서 변경 실패');
  return json.data;
}
