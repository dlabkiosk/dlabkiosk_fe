import { apiGet, apiPost, apiPut, apiDelete } from './client';

/* ── 타입 ── */

export interface MessageTemplate {
  id: number;
  storeId: number;
  storeName: string;
  content: string;
  createdAt: string;
}

export interface MessageTemplateCreateBody {
  storeId?: number;
  content: string;
}

export interface MessageTemplateUpdateBody {
  content: string;
}

export interface EligibleStudent {
  studentId: number;
  name: string;
  studentNumber: string;
  seatLabel: string | null;
}

export interface EligibleStudentPage {
  content: EligibleStudent[];
  number: number;
  size: number;
  totalPages: number;
  totalElements: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/* ── API ── */

/** 메시지 템플릿 전체 조회 */
export function getMessageTemplates(): Promise<MessageTemplate[]> {
  return apiGet<MessageTemplate[]>('/api/v1/admin/message-templates');
}

/** 메시지 템플릿 등록 */
export function createMessageTemplate(body: MessageTemplateCreateBody, storeId?: number): Promise<MessageTemplate> {
  return apiPost<MessageTemplate>(
    '/api/v1/admin/message-templates',
    { ...body, storeId } as unknown as Record<string, unknown>,
  );
}

/** 메시지 템플릿 수정 */
export function updateMessageTemplate(id: number, body: MessageTemplateUpdateBody): Promise<MessageTemplate> {
  return apiPut<MessageTemplate>(`/api/v1/admin/message-templates/${id}`, body as unknown as Record<string, unknown>);
}

/** 메시지 템플릿 삭제 */
export function deleteMessageTemplate(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/message-templates/${id}`);
}

/** 해당 템플릿으로 아직 발송되지 않은(받지 않은) 학생 페이지 조회 */
export function getMessageTemplateEligibleStudents(
  id: number,
  params: { page?: number; size?: number; sort?: string } = {},
): Promise<EligibleStudentPage> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.append('page', String(params.page));
  if (params.size != null) qs.append('size', String(params.size));
  if (params.sort) qs.append('sort', params.sort);
  const query = qs.toString();
  return apiGet<EligibleStudentPage>(
    `/api/v1/admin/message-templates/${id}/eligible-students${query ? `?${query}` : ''}`,
  );
}

/* ── 템플릿 등록(수신) 학생 ── */

export interface RecipientStudent {
  messageId: number;
  studentId: number;
  name: string;
  studentNumber: string | null;
  seatLabel?: string | null;
  active?: boolean;
  createdAt?: string;
}

export interface RecipientStudentPage {
  content: RecipientStudent[];
  number: number;
  size: number;
  totalPages: number;
  totalElements: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/** 해당 템플릿이 등록된(발송된) 학생 페이지 조회 */
export function getMessageTemplateRecipients(
  id: number,
  params: { page?: number; size?: number; sort?: string } = {},
): Promise<RecipientStudentPage> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.append('page', String(params.page));
  if (params.size != null) qs.append('size', String(params.size));
  if (params.sort) qs.append('sort', params.sort);
  const query = qs.toString();
  return apiGet<RecipientStudentPage>(
    `/api/v1/admin/message-templates/${id}/recipients${query ? `?${query}` : ''}`,
  );
}
