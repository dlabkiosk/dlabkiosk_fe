import { apiPost, ApiError } from './client';

export interface AttendanceResult {
  id: number;
  studentId: number;
  studentName: string;
  storeId: number;
  storeName: string;
  status: string;
  checkInAt: string;
  checkOutAt: string | null;
  studyTimeMinutes: number;
  messages: string[];
}

interface AttendanceBody {
  identifier?: string;
  studentNumber?: string;
}

const CHECK_IN_ERRORS: Record<string, string> = {
  ALREADY_CHECKED_IN: '이미 등원 처리가 되었습니다.',
  STUDENT_NOT_FOUND: '등록되지 않은 학생입니다.',
  STORE_MISMATCH: '해당 지점 소속 학생이 아닙니다.',
};

const CHECK_OUT_ERRORS: Record<string, string> = {
  NOT_CHECKED_IN: '등원 처리를 하지 않았습니다.',
  ALREADY_CHECKED_OUT: '이미 하원 처리가 되었습니다.',
  STUDENT_NOT_FOUND: '등록되지 않은 학생입니다.',
  STORE_MISMATCH: '해당 지점 소속 학생이 아닙니다.',
};

function withErrorMapping(promise: Promise<AttendanceResult>, errorMap: Record<string, string>): Promise<AttendanceResult> {
  return promise.catch((err) => {
    if (err instanceof ApiError && errorMap[err.code]) {
      throw new ApiError(err.code, errorMap[err.code]);
    }
    throw err;
  });
}

export function checkIn(body: AttendanceBody): Promise<AttendanceResult> {
  return withErrorMapping(
    apiPost<AttendanceResult>('/api/v1/kiosk/attendance/check-in', body as Record<string, unknown>),
    CHECK_IN_ERRORS,
  );
}

export function checkOut(body: AttendanceBody): Promise<AttendanceResult> {
  return withErrorMapping(
    apiPost<AttendanceResult>('/api/v1/kiosk/attendance/check-out', body as Record<string, unknown>),
    CHECK_OUT_ERRORS,
  );
}
