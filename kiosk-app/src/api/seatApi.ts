import { apiGet } from './client';

/* ── 타입 ── */

/** 구역 */
export interface SeatArea {
  areaCd: string;
  areaNm: string;
}

/** 좌석 현황 항목 */
export interface SeatInfo {
  seatCd: string;
  seatNm: string;
  xPos: number;
  yPos: number;
  /** Y(사용), N(미사용), E(통로) */
  seatGn: 'Y' | 'N' | 'E';
  /** S(등원), D(외출), N(미출석), B(공석), A(좌석이탈) */
  state: 'S' | 'D' | 'N' | 'B' | 'A';
  away: boolean;
}

/* ── API ── */

/** 구역 목록 조회 */
export function getSeatAreas(): Promise<SeatArea[]> {
  return apiGet<SeatArea[]>('/api/v1/kiosk/seats/areas');
}

/** 구역별 좌석 현황 조회 (areaCd 필수) */
export function getSeats(areaCd: string): Promise<SeatInfo[]> {
  return apiGet<SeatInfo[]>(`/api/v1/kiosk/seats?areaCd=${encodeURIComponent(areaCd)}`);
}
