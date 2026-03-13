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
  seatLabel: string;
  reasonName: string;
  startedAt: string;
  endedAt: string | null;
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

/* ── 좌석 이탈 기록 조회 ── */

/** 현재 이탈중인 학생 목록 조회 */
export function getActiveSeatLeaves(): Promise<SeatLeaveRecord[]> {
  return apiGet<SeatLeaveRecord[]>('/api/v1/admin/seat-leaves');
}
