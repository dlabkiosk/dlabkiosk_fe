const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export interface ExamSchedule {
  id: number;
  storeId: number;
  storeName: string;
  examName: string;
  examDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
}

export async function getExamSchedules(): Promise<ExamSchedule[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/exam-schedules`, {
    credentials: 'include',
  });
  const json: ApiResponse<ExamSchedule[]> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 조회 실패');
  return json.data;
}

export async function getExamSchedule(id: number): Promise<ExamSchedule> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/exam-schedules/${id}`, {
    credentials: 'include',
  });
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 조회 실패');
  return json.data;
}

export async function createExamSchedule(body: { examName: string; examDate: string; storeId?: number; active?: boolean }): Promise<ExamSchedule> {
  const params = new URLSearchParams();
  if (body.storeId) params.append('storeId', String(body.storeId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/exam-schedules${query}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examName: body.examName, examDate: body.examDate, active: body.active }),
  });
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 등록 실패');
  return json.data;
}

export async function updateExamSchedule(id: number, body: { examName: string; examDate: string }): Promise<ExamSchedule> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/exam-schedules/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 수정 실패');
  return json.data;
}

export async function deleteExamSchedule(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/exam-schedules/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json: ApiResponse<string> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 삭제 실패');
}

export async function toggleExamScheduleActive(id: number): Promise<ExamSchedule> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/exam-schedules/${id}/toggle-active`, {
    method: 'PATCH',
    credentials: 'include',
  });
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '활성화 상태 변경 실패');
  return json.data;
}
