import { apiPost, ApiError } from './client';

export interface PendingAction {
  action: string;
  message: string;
  regCd: string;
}

export interface MealInfo {
  mealType: 'LUNCH' | 'DINNER';
  mealLabel: string;
  applied: boolean;
  alreadyTagged: boolean;
  message: string;
}

export interface TagResult {
  processed: boolean;
  action: string;
  actionLabel: string;
  studentId: number;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
  checkInAt: string;
  checkOutAt: string | null;
  studyTimeMinutes: number;
  messages: string[];
  pendingActions: PendingAction[];
  dsaSynced: boolean;
  mealInfo: MealInfo | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  STUDENT_NOT_FOUND: '등록되지 않은 학생입니다.',
  STORE_MISMATCH: '해당 지점 소속 학생이 아닙니다.',
  ALREADY_CHECKED_IN: '이미 등원 처리가 되었습니다.',
  ALREADY_CHECKED_OUT: '이미 하원 처리가 되었습니다.',
  NOT_CHECKED_IN: '등원 처리를 하지 않았습니다.',
};

function withErrorMapping(promise: Promise<TagResult>): Promise<TagResult> {
  return promise.catch((err) => {
    if (err instanceof ApiError && ERROR_MESSAGES[err.code]) {
      throw new ApiError(err.code, ERROR_MESSAGES[err.code]);
    }
    throw err;
  });
}

/** 출결 태그 — RFID/QR identifier로 출결 자동 판별 */
export function tag(body: { identifier: string }): Promise<TagResult> {
  return withErrorMapping(
    apiPost<TagResult>('/api/v1/kiosk/tag', body as Record<string, unknown>),
  );
}

/** 외출/조퇴 확인 */
export function tagConfirm(body: { identifier: string; action: string }): Promise<TagResult> {
  return withErrorMapping(
    apiPost<TagResult>('/api/v1/kiosk/tag/confirm', body as Record<string, unknown>),
  );
}

/** 급식 태그 확인 */
export function tagMealConfirm(body: { identifier: string }): Promise<TagResult> {
  return withErrorMapping(
    apiPost<TagResult>('/api/v1/kiosk/tag/meal-confirm', body as Record<string, unknown>),
  );
}
