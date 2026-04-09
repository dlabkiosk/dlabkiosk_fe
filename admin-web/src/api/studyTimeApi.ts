import { apiGet } from './client';

/* ── 타입 ── */

export interface DailyStudyTime {
  date: string;
  studyTimeMinutes: number;
  studyTime: string;
}

export interface StudentStudyTime {
  storeId?: number;
  storeName?: string;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
  totalMinutes: number;
  totalStudyTime: string;
  dailyStudyTimes: DailyStudyTime[];
}

export interface StudyTimeParams {
  storeId?: number;
  startDate: string;
  endDate: string;
  studentName?: string;
  studentNumber?: string;
}

/* ── API ── */

/**
 * 지점별 학생 일일 순공시간 목록을 조회합니다.
 * startDate / endDate 형식: YYYY-MM-DD
 */
export function getStudyTimes(params: StudyTimeParams): Promise<StudentStudyTime[]> {
  const query = new URLSearchParams();
  if (params.storeId != null) query.set('storeId', String(params.storeId));
  query.set('startDate', params.startDate);
  query.set('endDate', params.endDate);
  if (params.studentName) query.set('studentName', params.studentName);
  if (params.studentNumber) query.set('studentNumber', params.studentNumber);

  return apiGet<StudentStudyTime[]>(`/api/v1/admin/study-times?${query.toString()}`);
}

/** 학생별 순공시간 엑셀(.xlsx) 다운로드 — 조회와 동일한 파라미터 */
export async function exportStudyTimes(params: StudyTimeParams): Promise<void> {
  const query = new URLSearchParams();
  if (params.storeId != null) query.set('storeId', String(params.storeId));
  query.set('startDate', params.startDate);
  query.set('endDate', params.endDate);
  if (params.studentName) query.set('studentName', params.studentName);
  if (params.studentNumber) query.set('studentNumber', params.studentNumber);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/study-times/export?${query.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('엑셀 다운로드 실패');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `순공시간_${params.startDate}_${params.endDate}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
