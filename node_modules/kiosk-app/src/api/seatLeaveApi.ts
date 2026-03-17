import { apiGet, apiPost } from './client';

/* ── 타입 ── */

export interface SeatLeaveReason {
  id: number;
  storeId: number;
  reasonName: string;
  displayOrder: number;
  active: boolean;
}

export interface SeatLeaveResult {
  id: number;
  studentId: number;
  studentName: string;
  seatLabel: string;
  reasonName: string;
  startedAt: string;
  endedAt: string | null;
}

/* ── API ── */

/** 현재 지점의 활성 이탈 사유 조회 */
export function getSeatLeaveReasons(): Promise<SeatLeaveReason[]> {
  return apiGet<SeatLeaveReason[]>('/api/v1/kiosk/seat-leaves/reasons');
}

/** 좌석 이탈 시작 — identifier로 학생 식별 */
export function startSeatLeave(identifier: string, reasonId: number): Promise<SeatLeaveResult> {
  return apiPost<SeatLeaveResult>('/api/v1/kiosk/seat-leaves/start', { identifier, reasonId });
}

/** 좌석 이탈 복귀 — identifier로 학생 식별 */
export function endSeatLeave(identifier: string): Promise<SeatLeaveResult> {
  return apiPost<SeatLeaveResult>('/api/v1/kiosk/seat-leaves/end', { identifier });
}
