import { apiGet } from './client';

/* ── 타입 ── */

export interface StudentAttendanceStatus {
  studentId: number;
  studentName: string;
  seatLabel: string | null;
  status: 'PRESENT' | 'OUTING' | 'EARLY_LEAVE' | 'CHECKED_OUT';
}

/* ── API ── */

/** 오늘의 학생별 출결 상태 조회 */
export function getTodayAttendanceStatus(): Promise<StudentAttendanceStatus[]> {
  return apiGet<StudentAttendanceStatus[]>('/api/v1/admin/attendance/today-status');
}
