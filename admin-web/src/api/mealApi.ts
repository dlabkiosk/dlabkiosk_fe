import { apiGet } from './client';

/* ── 타입 ── */

export interface MealRecord {
  studentId: number;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
  date: string;
  lunchApplied: boolean;
  lunchChecked: boolean;
  lunchCheckedTime: string | null;
  dinnerApplied: boolean;
  dinnerChecked: boolean;
  dinnerCheckedTime: string | null;
  /** 프론트에서 ADMIN 전체 조회 시 주입 */
  storeName?: string;
}

export interface MealParams {
  storeId?: number;
  startDate?: string;
  endDate?: string;
  studentName?: string;
  studentNumber?: string;
}

/* ── API ── */

/**
 * 기간 내 학생별 급식 신청/체크 현황을 조회합니다.
 * startDate / endDate 형식: YYYY-MM-DD (미입력 시 오늘 기본값)
 */
export function getMeals(params?: MealParams): Promise<MealRecord[]> {
  const query = new URLSearchParams();
  if (params?.storeId != null) query.set('storeId', String(params.storeId));
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.studentName) query.set('studentName', params.studentName);
  if (params?.studentNumber) query.set('studentNumber', params.studentNumber);

  const qs = query.toString();
  return apiGet<MealRecord[]>(`/api/v1/admin/meals${qs ? `?${qs}` : ''}`);
}
