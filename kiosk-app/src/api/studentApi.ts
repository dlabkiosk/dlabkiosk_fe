import { apiGet } from './client';

export interface SeatChangeRequest {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  storeId: number;
  storeName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentSeatLabel: string;
  currentSeatCd: string;
  desiredSeat1Label: string;
  desiredSeat1Cd: string;
  desiredSeat2Label: string;
  desiredSeat2Cd: string;
  desiredSeat3Label: string;
  desiredSeat3Cd: string;
  approvedSeatLabel: string | null;
  approvedSeatCd: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PhoneSubmission {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  className: string;
  seatLabel: string;
  submissionType: string;
  phoneLast4: string;
  parentPhoneNumber: string;
  startDate: string;
  endDate: string;
  memo: string;
  submittedAt: string;
}

export interface SeatLeave {
  id: number;
  studentId: number;
  studentName: string;
  seatLabel: string;
  reasonName: string;
  startedAt: string;
  endedAt: string | null;
}

export interface MealApplication {
  day: string;
  mealType: string;
}

export interface Receipt {
  receiptName: string;
  suppliedAmount: string;
  receivedAmount: string;
  unpaidAmount: string;
}

export interface AttendanceSummary {
  absenceCount: number;
  earlyLeaveCount: number;
  outingCount: number;
  lateCount: number;
}

export interface PointRecord {
  pointDate: string;
  reason: string;
  point: number;
}

export interface StudentSearchResult {
  id: number;
  name: string;
  studentNumber: string;
  phoneLast4: string;
  assignedSeatLabel: string;
  phoneSubmissions: PhoneSubmission[];
  seatChangeRequests: SeatChangeRequest[];
  seatLeaves: SeatLeave[];
  mealApplications: MealApplication[];
  receipts: Receipt[];
  attendanceSummary: AttendanceSummary | null;
  points: PointRecord[];
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
