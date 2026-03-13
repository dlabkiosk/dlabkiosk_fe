export interface PhoneSubmission {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
}

export async function getPhoneSubmissions(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<PhoneSubmission>> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));
  query.set('sort', 'submittedAt,DESC');

  const res = await fetch(`/api/v1/admin/phone-submissions?${query.toString()}`);
  const json: ApiResponse<PageResponse<PhoneSubmission>> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '휴대폰 미소지 조회 실패');
  return json.data;
}

export async function exportPhoneSubmissions(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const res = await fetch(`/api/v1/admin/phone-submissions/export?${query.toString()}`);
  if (!res.ok) throw new Error('엑셀 다운로드 실패');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `휴대폰미소지_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
