import { apiGet, apiDelete, apiPut } from './client';

/* ── 타입 ── */

export type SubmissionType = 'DAILY' | 'PERMANENT';

export interface PhoneSubmission {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  className: string;
  seatLabel: string;
  submissionType: SubmissionType;
  phoneLast4: string;
  parentPhoneNumber: string;
  /** 신청 시작일 (YYYY-MM-DD) */
  startDate: string;
  /** 신청 종료일 (YYYY-MM-DD), PERMANENT인 경우 null */
  endDate: string | null;
  memo: string;
  /** ISO datetime */
  submittedAt: string;
}

export interface PageResponse<T> {
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  content: T[];
}

/* ── API ── */

export function getPhoneSubmissions(params?: {
  startDate?: string;
  endDate?: string;
  studentName?: string;
  studentNumber?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<PhoneSubmission>> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.studentName) query.set('studentName', params.studentName);
  if (params?.studentNumber) query.set('studentNumber', params.studentNumber);
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));
  query.set('sort', 'submittedAt,DESC');

  return apiGet<PageResponse<PhoneSubmission>>(`/api/v1/admin/phone-submissions?${query.toString()}`);
}

export function updatePhoneSubmission(
  id: number,
  body: { endDate?: string | null; submissionType?: SubmissionType },
): Promise<PhoneSubmission> {
  return apiPut<PhoneSubmission>(
    `/api/v1/admin/phone-submissions/${id}`,
    body as Record<string, unknown>,
  );
}

export function deletePhoneSubmission(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/phone-submissions/${id}`);
}

export async function exportPhoneSubmissions(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/phone-submissions/export?${query.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('엑셀 다운로드 실패');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `휴대폰미소지_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
