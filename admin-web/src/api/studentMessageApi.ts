import { apiGet, apiPost, apiPut, apiDelete } from './client';

/* ── 타입 ── */

export interface StudentMessage {
  id: number;
  studentId: number;
  studentName: string;
  content: string;
  active: boolean;
  createdAt: string;
}

export interface StudentMessageCreateBody {
  studentIds: number[];
  content: string;
}

export interface StudentMessageUpdateBody {
  content: string;
  active: boolean;
}

/* ── API ── */

/** 특정 학생의 메시지 전체 조회 */
export function getStudentMessages(studentId: number): Promise<StudentMessage[]> {
  return apiGet<StudentMessage[]>(`/api/v1/admin/student-messages?studentId=${studentId}`);
}

/** 학생 메시지 등록 (복수 학생 지원) */
export function createStudentMessage(body: StudentMessageCreateBody): Promise<StudentMessage[]> {
  return apiPost<StudentMessage[]>('/api/v1/admin/student-messages', body as unknown as Record<string, unknown>);
}

/** 학생 메시지 수정 */
export function updateStudentMessage(id: number, body: StudentMessageUpdateBody): Promise<StudentMessage> {
  return apiPut<StudentMessage>(`/api/v1/admin/student-messages/${id}`, body as unknown as Record<string, unknown>);
}

/** 학생 메시지 삭제 */
export function deleteStudentMessage(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/student-messages/${id}`);
}
