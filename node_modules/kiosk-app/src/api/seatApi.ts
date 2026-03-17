import { apiGet } from './client';

/* ── 타입 ── */

export interface SeatInfo {
  seatId: number;
  seatLabel: string;
  seatType: string;
  xPos: number;
  yPos: number;
  available: boolean;
  outing: boolean;
  away: boolean;
  studentId: number | null;
  studentName: string | null;
}

/* ── API ── */

/** 로그인한 지점의 전체 좌석 현황 조회 */
export function getSeats(): Promise<SeatInfo[]> {
  return apiGet<SeatInfo[]>('/api/v1/kiosk/seats');
}
