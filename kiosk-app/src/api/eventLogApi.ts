import { apiPost } from './client';

export type EventLogType =
  | 'TAG'
  | 'TAG_CONFIRM'
  | 'MEAL_CONFIRM'
  | 'SEAT_LEAVE_START'
  | 'SEAT_LEAVE_END';

export type InputMethod = 'CARD' | 'QR' | 'SEAT_LABEL' | 'PHONE_LAST4';

interface EventLogPayload {
  eventType: EventLogType;
  inputMethod: InputMethod;
  identifier: string;
  success: boolean;
  resultAction?: string;
  studentName?: string;
  errorMessage?: string;
}

/** 키오스크 이벤트 로그 전송 (fire-and-forget) */
export function sendEventLog(payload: EventLogPayload): void {
  apiPost('/api/v1/kiosk/event-logs', payload as unknown as Record<string, unknown>)
    .catch((err) => {
      console.warn('[EventLog] 전송 실패:', err);
    });
}
