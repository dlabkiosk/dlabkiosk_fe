import { apiGet } from './client';

/* ── 타입 ── */

export interface AttendanceRecord {
  studentId: number;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
  attendanceStatus: string;
  phoneSubmitted: boolean;
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
