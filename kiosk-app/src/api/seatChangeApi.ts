import { apiGet, apiPost, apiDelete, ApiError } from './client';

export interface AvailableSeat {
  seatId: number;
  seatLabel: string;
  seatType: string;
  available: boolean;
}

export interface SeatChangeRequestBody {
  identifier?: string;
  studentNumber?: string;
  phoneLast4?: string;
  seatLabel?: string;
  desiredSeatId1: number;
  desiredSeatId2?: number;
  desiredSeatId3?: number;
}

export interface SeatChangeResult {
  id: number;
  studentName: string;
  studentId: number;
  currentSeatLabel: string;
  desiredSeat1Label: string;
  desiredSeat2Label: string | null;
  desiredSeat3Label: string | null;
  status: string;
  createdAt: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_PENDING: '이미 대기 중인 좌석 변경 신청이 있습니다.',
  STUDENT_NOT_FOUND: '등록되지 않은 학생입니다.',
  SEAT_NOT_FOUND: '존재하지 않는 좌석입니다.',
  SAME_SEAT: '현재 좌석과 동일한 좌석은 선택할 수 없습니다.',
  SEAT_NOT_AVAILABLE: '해당 좌석은 선택할 수 없습니다.',
};

export function getAvailableSeats(): Promise<AvailableSeat[]> {
  return apiGet<AvailableSeat[]>('/api/v1/kiosk/seat-change-requests/available-seats');
}

export async function submitSeatChangeRequest(body: SeatChangeRequestBody): Promise<SeatChangeResult> {
  try {
    return await apiPost<SeatChangeResult>('/api/v1/kiosk/seat-change-requests', body);
  } catch (err) {
    if (err instanceof ApiError && ERROR_MESSAGES[err.code]) {
      throw new ApiError(err.code, ERROR_MESSAGES[err.code]);
    }
    throw err;
  }
}

export function cancelSeatChangeRequest(requestId: number, params: { identifier?: string; studentNumber?: string }): Promise<string> {
  return apiDelete<string>(`/api/v1/kiosk/seat-change-requests/${requestId}`, params);
}
