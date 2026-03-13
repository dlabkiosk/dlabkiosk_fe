import { apiPost, ApiError } from './client';

export interface PhoneSubmissionResult {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  seatLabel: string;
  submittedAt: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_SUBMITTED: '오늘 이미 휴대폰 미소지 신청을 하셨습니다.',
  STUDENT_NOT_FOUND: '해당 좌석에 배정된 학생이 없습니다.',
  SEAT_NOT_FOUND: '존재하지 않는 좌석번호입니다.',
};

export async function submitPhoneSubmission(seatLabel: string): Promise<PhoneSubmissionResult> {
  try {
    return await apiPost<PhoneSubmissionResult>('/api/v1/kiosk/phone-submissions', { seatLabel });
  } catch (err) {
    if (err instanceof ApiError && ERROR_MESSAGES[err.code]) {
      throw new ApiError(err.code, ERROR_MESSAGES[err.code]);
    }
    throw err;
  }
}
