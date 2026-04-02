import { apiGet, apiPost, apiPut, apiDelete } from './client';

/* ── 이탈 사유 타입 ── */

export interface SeatLeaveReason {
  id: number;
  storeId: number;
  reasonName: string;
  displayOrder: number;
  active: boolean;
}

/* ── 이탈 기록 타입 ── */

export interface SeatLeaveRecord {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber?: string;
  className?: string;
  seatLabel: string;
  reasonName: string;
  startedAt: string;
  endedAt: string | null;
  /** 프론트에서 ADMIN 전체 조회 시 주입 */
  storeName?: string;
}

/* ── 이탈 사유 CRUD ── */

/** 이탈 사유 목록 조회 */
export function getSeatLeaveReasons(): Promise<SeatLeaveReason[]> {
  return apiGet<SeatLeaveReason[]>('/api/v1/admin/seat-leave-reasons');
}

/** 이탈 사유 등록 */
export function createSeatLeaveReason(params: {
  reasonName: string;
  displayOrder: number;
  active: boolean;
  storeId?: number;
}): Promise<SeatLeaveReason> {
  return apiPost<SeatLeaveReason>('/api/v1/admin/seat-leave-reasons', params as Record<string, unknown>);
}

/** 이탈 사유 수정 */
export function updateSeatLeaveReason(id: number, params: {
  reasonName: string;
  displayOrder: number;
  active: boolean;
}): Promise<SeatLeaveReason> {
  return apiPut<SeatLeaveReason>(`/api/v1/admin/seat-leave-reasons/${id}`, params as Record<string, unknown>);
}

/** 이탈 사유 삭제 */
export function deleteSeatLeaveReason(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/seat-leave-reasons/${id}`);
}

/* ── 페이지 응답 ── */

export interface PageResponse<T> {
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  content: T[];
}

/* ── 좌석 이탈 기록 조회 ── */

/** 기간별 좌석이탈 현황 조회 (페이지네이션) */
export function getSeatLeaves(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SeatLeaveRecord>> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));
  query.set('sort', 'startedAt,DESC');

  return apiGet<PageResponse<SeatLeaveRecord>>(`/api/v1/admin/seat-leaves?${query.toString()}`);
}

/** 관리자 강제 복귀 처리 */
export function forceReturnSeatLeave(id: number): Promise<SeatLeaveRecord> {
  return apiPost<SeatLeaveRecord>(`/api/v1/admin/seat-leaves/${id}/force-return`);
}

/** 좌석이탈 엑셀 다운로드 */
export async function exportSeatLeaves(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/seat-leaves/export?${query.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('엑셀 다운로드 실패');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `좌석이탈_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
