import { apiGet } from './client';

export interface SeatChangeRequest {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentSeatLabel: string;
  desiredSeat1Label: string;
  desiredSeat2Label: string;
  desiredSeat3Label: string;
  approvedSeatLabel: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface StudentSearchResult {
  id: number;
  name: string;
  studentNumber: string;
  phoneLast4: string;
  assignedSeatLabel: string;
  seatChangeRequest: SeatChangeRequest | null;
}

/**
 * 통합 학생 검색 — identifier 하나로 카드/QR/좌석번호/폰뒷자리 전부 처리
 */
export function searchStudent(params: { identifier?: string; studentNumber?: string; phoneLast4?: string }): Promise<StudentSearchResult> {
  const query = new URLSearchParams();
  if (params.identifier) query.set('identifier', params.identifier);
  if (params.studentNumber) query.set('studentNumber', params.studentNumber);
  if (params.phoneLast4) query.set('phoneLast4', params.phoneLast4);
  return apiGet<StudentSearchResult>(`/api/v1/kiosk/students/search?${query.toString()}`);
}

/** 좌석번호로 학생 검색 */
export function getStudentBySeat(seatLabel: string): Promise<StudentSearchResult> {
  return apiGet<StudentSearchResult>(`/api/v1/kiosk/students/search?identifier=${encodeURIComponent(seatLabel)}&inputMethod=SEAT_LABEL`);
}

/** 전화번호 뒷자리로 학생 검색 */
export function getStudentByPhone(phoneLast4: string): Promise<StudentSearchResult> {
  return apiGet<StudentSearchResult>(`/api/v1/kiosk/students/search?identifier=${encodeURIComponent(phoneLast4)}&inputMethod=PHONE_LAST4`);
}

/** 전화번호 뒤 8자리로 학생 검색 (학적 조회 전용) */
export function getStudentByPhone8(phone8: string): Promise<StudentSearchResult> {
  return apiGet<StudentSearchResult>(`/api/v1/kiosk/students/search?identifier=${encodeURIComponent(phone8)}&inputMethod=PHONE`);
}
