import { apiGet } from './client';

/* ── 타입 ── */

export interface DailyStudyTime {
  date: string;
  studyTimeMinutes: number;
  studyTime: string;
}

export interface StudentStudyTime {
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
