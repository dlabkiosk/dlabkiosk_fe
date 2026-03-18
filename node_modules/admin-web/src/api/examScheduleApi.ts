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
  const res = await fetch('/api/v1/admin/exam-schedules');
  const json: ApiResponse<ExamSchedule[]> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 조회 실패');
  return json.data;
}

export async function getExamSchedule(id: number): Promise<ExamSchedule> {
  const res = await fetch(`/api/v1/admin/exam-schedules/${id}`);
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 조회 실패');
  return json.data;
}

export async function createExamSchedule(body: { examName: string; examDate: string; storeId?: number }): Promise<ExamSchedule> {
  const res = await fetch('/api/v1/admin/exam-schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 등록 실패');
  return json.data;
}

export async function updateExamSchedule(id: number, body: { examName: string; examDate: string }): Promise<ExamSchedule> {
  const res = await fetch(`/api/v1/admin/exam-schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 수정 실패');
  return json.data;
}

export async function deleteExamSchedule(id: number): Promise<void> {
  const res = await fetch(`/api/v1/admin/exam-schedules/${id}`, {
    method: 'DELETE',
  });
  const json: ApiResponse<string> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '시험일정 삭제 실패');
}

export async function toggleExamScheduleActive(id: number): Promise<ExamSchedule> {
  const res = await fetch(`/api/v1/admin/exam-schedules/${id}/toggle-active`, {
    method: 'PATCH',
  });
  const json: ApiResponse<ExamSchedule> = await res.json();
  if (!json.success) throw new Error(json.error?.message || '활성화 상태 변경 실패');
  return json.data;
}
