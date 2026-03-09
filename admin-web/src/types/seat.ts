/** 좌석 상태 */
export const SEAT_STATUS = {
  AVAILABLE: '사용가능',
  OCCUPIED: '사용중',
  RESERVED: '예약',
  DISABLED: '사용불가',
} as const;

export type SeatStatus = (typeof SEAT_STATUS)[keyof typeof SEAT_STATUS];

/** 좌석 정보 */
export interface SeatInfo {
  id: number;
  seatNumber: string;
  status: SeatStatus;
  memberId: number | null;
  memberName: string | null;
}

/** 좌석 이탈 현황 */
export interface SeatLeaveSummary {
  currentLeave: number;
  waitingReturn: number;
}
