import { apiGet, apiPost, ApiError } from './client';

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

/** /my 엔드포인트 응답 항목 */
export interface ActiveSubmissionPeriod {
  startDate: string;
  endDate: string;
  submissionType: SubmissionType;
}

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_SUBMITTED: '이미 해당 기간에 휴대폰 미소지 신청이 되어있습니다.',
  STUDENT_NOT_FOUND: '등록되지 않은 학생입니다.',
  SEAT_NOT_FOUND: '존재하지 않는 좌석번호입니다.',
};

/** 해당 학생의 활성 신청 기간 목록 조회 (달력 블러 처리용) */
export function getMyPhoneSubmissions(identifier: string): Promise<ActiveSubmissionPeriod[]> {
  return apiGet<ActiveSubmissionPeriod[]>(
    `/api/v1/kiosk/phone-submissions/my?identifier=${encodeURIComponent(identifier)}`,
  );
}

export async function submitPhoneSubmission(params: {
  identifier: string;
  inputMethod?: string;
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
