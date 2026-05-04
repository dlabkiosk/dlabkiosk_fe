import { apiGet, apiPut, apiDelete } from './client';

/* ── 타입 ── */

export interface AttendanceRecord {
  studentId: number;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
  /** DSA 기준 현재 상태. 우리 시스템과 어긋나면 '미확인'이 될 수 있음 */
  attendanceStatus: string;
  /** 우리 시스템이 기억하고 있는 상태 (하원/조퇴/외출/등원 등). dsaDrift=true일 때 취소 대상 판별용 */
  ourState?: string;
  /** DSA 상태와 우리 시스템 상태가 어긋남 여부. true면 관리자가 우리 쪽 기록을 취소해야 동기화됨 */
  dsaDrift?: boolean;
  /** 우리 시스템 등원 처리 시각. null이면 DSA에서 직접 처리된 케이스 */
  checkedInAt: string | null;
  /** 하원/조퇴 처리 시각. 백엔드가 제공하면 수정 모달에서 프리필에 사용 */
  checkOutAt?: string | null;
  /** 진행 중 외출의 시작 시각. 백엔드가 제공하면 외출 수정 모달 프리필 용도 */
  outingStartedAt?: string | null;
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

/**
 * 학생의 당일 최신 하원/조퇴 기록을 수정합니다.
 * - checkOutAt에 시각을 넣으면: 하원 시각 수정 (checkOutAction으로 유형 변경도 가능. T=하원, C=조퇴)
 * - checkOutAt을 null로 보내면: 하원 취소 → 등원중 상태로 복원
 */
export function updateCheckOut(
  studentId: number,
  checkOutAt: string | null,
  checkOutAction?: 'T' | 'C',
): Promise<string> {
  return apiPut<string>('/api/v1/admin/attendances/check-out', {
    studentId,
    checkOutAt,
    checkOutAction,
  });
}

/**
 * 해당 학생의 오늘치 최신 외출 기록을 수정합니다.
 * - 기존 endedAt=null + 새 endedAt=null → startedAt만 수정
 * - 기존 endedAt=null + 새 endedAt=값 → 복귀 처리 (차감 누적, 좌석 IN_USE)
 * - 기존 endedAt=값 + 새 endedAt=null → 복귀 취소 (차감 롤백, 좌석 OUTING)
 * - 기존 endedAt=값 + 새 endedAt=값 → 기간 수정 (차감 롤백 후 새 차감 누적)
 */
export function updateOuting(
  studentId: number,
  startedAt: string,
  endedAt: string | null,
): Promise<string> {
  return apiPut<string>('/api/v1/admin/outings', { studentId, startedAt, endedAt });
}

/**
 * 해당 학생의 오늘치 진행 중(endedAt IS NULL) 외출 기록을 삭제합니다.
 * 더블 태그 등으로 잘못 생성된 phantom 외출 정리용. 진행 중 외출이 없으면 404.
 */
export function deleteOngoingOuting(studentId: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/outings?studentId=${studentId}`);
}
