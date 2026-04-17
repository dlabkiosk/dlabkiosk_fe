import { apiGet, apiPut } from './client';

/* ── 타입 ── */

export interface AttendanceRecord {
  studentId: number;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
  attendanceStatus: string;
  /** 우리 시스템 등원 처리 시각. null이면 DSA에서 직접 처리된 케이스 */
  checkedInAt: string | null;
  late: boolean;
  phoneSubmitted: boolean;
  /** 프론트에서 ADMIN 전체 조회 시 주입 */
  storeName?: string;
}

export interface AttendanceParams {
  storeId?: number;
  studentName?: string;
  studentNumber?: string;
  attendanceStatus?: string;
  phoneSubmitted?: boolean;
}

/* ── API ── */

/**
 * 해당 지점 학생들의 출결 현황을 조회합니다.
 * attendanceStatus: 등원 | 외출 | 이탈 | 미출석
 * phoneSubmitted: true(미소지 신청) / false(미신청) / 미입력(전체)
 */
export function getAttendances(params?: AttendanceParams): Promise<AttendanceRecord[]> {
  const query = new URLSearchParams();
  if (params?.storeId != null) query.set('storeId', String(params.storeId));
  if (params?.studentName) query.set('studentName', params.studentName);
  if (params?.studentNumber) query.set('studentNumber', params.studentNumber);
  if (params?.attendanceStatus) query.set('attendanceStatus', params.attendanceStatus);
  if (params?.phoneSubmitted != null) query.set('phoneSubmitted', String(params.phoneSubmitted));

  const qs = query.toString();
  return apiGet<AttendanceRecord[]>(`/api/v1/admin/attendances${qs ? `?${qs}` : ''}`);
}

/**
 * 이미 등원 처리된 학생의 등원 시각을 수정합니다. 순공시간 보정용.
 * @param checkInAt ISO LocalDateTime 문자열 (예: 2026-04-17T08:30:00)
 */
export function updateCheckInTime(studentId: number, checkInAt: string): Promise<string> {
  return apiPut<string>('/api/v1/admin/attendances/check-in-time', { studentId, checkInAt });
}
