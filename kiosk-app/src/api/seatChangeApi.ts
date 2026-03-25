import { apiGet, apiPost, apiDelete, ApiError } from './client';

export interface AvailableSeat {
  seatId: number;
  seatLabel: string;
  seatType: string;
  assignedStudentName: string | null;
  available: boolean;
}

/** 구역별 좌석 (좌석 변경 전용) */
export interface SeatChangeSeatInfo {
  seatId: number;
  seatCd: string;
  seatLabel: string;
  xPos: number;
  yPos: number;
  seatGn: string;
}

export interface SeatChangeAreaGroup {
  areaCd: string;
  areaNm: string;
  seats: SeatChangeSeatInfo[];
}

export interface SeatChangeRequestBody {
  identifier?: string;
  inputMethod?: string;
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

/** 내 좌석 변경 신청 상세 (PENDING 상태) */
export interface MySeatChangeRequest {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  storeId: number;
  storeName: string;
  currentSeatLabel: string;
  desiredSeat1Label: string;
  desiredSeat2Label: string | null;
  desiredSeat3Label: string | null;
  approvedSeatLabel: string | null;
  status: string;
  createdAt: string;
  processedAt: string | null;
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

/** 내 PENDING 상태 좌석 변경 신청 조회 (없으면 null) */
export function getMySeatChangeRequest(identifier: string, inputMethod?: string): Promise<MySeatChangeRequest | null> {
  const query = new URLSearchParams({ identifier });
  if (inputMethod) query.set('inputMethod', inputMethod);
  return apiGet<MySeatChangeRequest | null>(`/api/v1/kiosk/seat-change-requests/my?${query.toString()}`);
}

/** 좌석 변경용 구역별 좌석 조회 */
export function getSeatsByArea(): Promise<SeatChangeAreaGroup[]> {
  return apiGet<SeatChangeAreaGroup[]>('/api/v1/kiosk/seat-change-requests/seats-by-area');
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

export function cancelSeatChangeRequest(requestId: number, params: { identifier?: string; inputMethod?: string; studentNumber?: string }): Promise<string> {
  const query = new URLSearchParams();
  if (params.identifier) query.set('identifier', params.identifier);
  if (params.inputMethod) query.set('inputMethod', params.inputMethod);
  if (params.studentNumber) query.set('studentNumber', params.studentNumber);
  return apiDelete<string>(`/api/v1/kiosk/seat-change-requests/${requestId}?${query.toString()}`);
}
