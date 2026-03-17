import { apiPost, ApiError } from './client';

export type SubmissionType = 'DAILY' | 'PERIOD' | 'NO_PHONE';

export interface PhoneSubmissionResult {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  className: string;
  seatLabel: string;
  submissionType: SubmissionType;
  phoneLast4: string;
  parentPhoneNumber: string;
  startDate: string;
  endDate: string;
  memo: string;
  submittedAt: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_SUBMITTED: '이미 해당 기간에 휴대폰 미소지 신청이 되어있습니다.',
  STUDENT_NOT_FOUND: '등록되지 않은 학생입니다.',
  SEAT_NOT_FOUND: '존재하지 않는 좌석번호입니다.',
};

export async function submitPhoneSubmission(params: {
  identifier: string;
  submissionType: SubmissionType;
  startDate?: string;
  endDate?: string;
}): Promise<PhoneSubmissionResult> {
  try {
    return await apiPost<PhoneSubmissionResult>('/api/v1/kiosk/phone-submissions', params as Record<string, unknown>);
  } catch (err) {
    if (err instanceof ApiError && ERROR_MESSAGES[err.code]) {
      throw new ApiError(err.code, ERROR_MESSAGES[err.code]);
    }
    throw err;
  }
}
