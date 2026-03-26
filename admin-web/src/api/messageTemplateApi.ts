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

/* ── API ── */

/** 메시지 템플릿 전체 조회 */
export function getMessageTemplates(): Promise<MessageTemplate[]> {
  return apiGet<MessageTemplate[]>('/api/v1/admin/message-templates');
}

/** 메시지 템플릿 등록 */
export function createMessageTemplate(body: MessageTemplateCreateBody): Promise<MessageTemplate> {
  return apiPost<MessageTemplate>('/api/v1/admin/message-templates', body as unknown as Record<string, unknown>);
}

/** 메시지 템플릿 수정 */
export function updateMessageTemplate(id: number, body: MessageTemplateUpdateBody): Promise<MessageTemplate> {
  return apiPut<MessageTemplate>(`/api/v1/admin/message-templates/${id}`, body as unknown as Record<string, unknown>);
}

/** 메시지 템플릿 삭제 */
export function deleteMessageTemplate(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/message-templates/${id}`);
}
