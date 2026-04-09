import { apiGet, apiPost, apiPut, apiDelete } from './client';

/* ── 타입 ── */

export interface StudentMessage {
  id: number;
  studentId: number;
  studentName: string;
  content: string;
  active: boolean;
  createdAt: string;
  /** 템플릿 기반으로 등록된 경우의 템플릿 id */
  templateId?: number | null;
}

export interface StudentMessageCreateBody {
  studentIds: number[];
  /** 커스텀 메시지. templateId와 둘 중 하나만 지정 */
  content?: string;
  /** 템플릿 기반 등록 시 템플릿 id. content와 둘 중 하나만 지정 */
  templateId?: number;
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

/** 특정 템플릿에 연결된 학생 메시지 조회 */
export function getStudentMessagesByTemplate(templateId: number): Promise<StudentMessage[]> {
  return apiGet<StudentMessage[]>(`/api/v1/admin/student-messages?templateId=${templateId}`);
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

/** 학생 메시지 일괄 삭제 — 템플릿 발송 row 포함 시 전체 롤백 */
export function bulkDeleteStudentMessages(messageIds: number[]): Promise<string> {
  return apiPost<string>('/api/v1/admin/student-messages/bulk-delete', { messageIds });
}
