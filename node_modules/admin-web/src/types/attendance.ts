/** 출결 상태 */
export const ATTENDANCE_STATUS = {
  PRESENT: '출석',
  EARLY_LEAVE: '조퇴',
  ABSENT: '결석',
  OUTING: '외출',
  LATE: '지각',
} as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

/** 출결 현황 요약 항목 */
export interface AttendanceSummary {
  status: AttendanceStatus;
  count: number;
}

/** 출결 기록 */
export interface AttendanceRecord {
  id: number;
  memberId: number;
  memberName: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  date: string;
}
