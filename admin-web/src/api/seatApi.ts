import { apiGet, apiPost, apiPut, apiDelete } from './client';

/* ── 타입 ── */

/** 좌석 */
export interface Seat {
  id: number;
  storeId: number;
  seatLabel: string;
  seatType: string;
  /** 캔버스 X 좌표 (픽셀) */
  xPos: number;
  /** 캔버스 Y 좌표 (픽셀) */
  yPos: number;
  active: boolean;
}

/** 좌석 생성/수정 요청 바디 */
export interface SeatBody {
  seatLabel: string;
  seatType: string;
  xPos: number;
  yPos: number;
  active?: boolean;
}

/** 좌석 변경 신청 항목 */
export interface SeatChangeRequest {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  storeId: number;
  storeName: string;
  currentSeatLabel: string;
  desiredSeat1Label: string;
  desiredSeat2Label: string;
  desiredSeat3Label: string;
  /** 승인된 좌석 (승인 전이면 null) */
  approvedSeatLabel: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  /** 처리 일시 (승인/거절 시), PENDING이면 null */
  processedAt: string | null;
}

/** 좌석 현황 - 좌석별 배정자 + 대기자 */
export interface SeatStatusItem {
  seatId: number;
  seatLabel: string;
  seatType: string;
  assignedStudentName: string | null;
  assignedStudentNumber: string | null;
  assignedClassName: string | null;
  waitingCount: number;
  waitingList: SeatWaitingEntry[];
}

export interface SeatWaitingEntry {
  requestId: number;
  studentName: string;
  studentNumber: string;
  priority: number;
  createdAt: string;
}

export interface PageResponse<T> {
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  content: T[];
}

/* ── 좌석 CRUD API ── */

/** 좌석 전체 조회 (MANAGER: 자기 지점, ADMIN: 전체) */
export function getSeats(): Promise<Seat[]> {
  return apiGet<Seat[]>('/api/v1/admin/seats');
}

/** 좌석 상세 (단건 조회 응답) */
export interface SeatDetail extends Seat {
  assignedStudentName: string | null;
  assignedStudentNumber: string | null;
  assignedClassName: string | null;
  waitingCount: number;
  waitingList: SeatWaitingEntry[];
}

/** 좌석 단건 조회 */
export function getSeat(seatId: number): Promise<SeatDetail> {
  return apiGet<SeatDetail>(`/api/v1/admin/seats/${seatId}`);
}

/** 좌석 생성 (ADMIN: storeId 필수, MANAGER: 자기 지점 자동) */
export function createSeat(body: SeatBody, storeId?: number): Promise<Seat> {
  const query = storeId ? `?storeId=${storeId}` : '';
  return apiPost<Seat>(`/api/v1/admin/seats${query}`, body as unknown as Record<string, unknown>);
}

/** 좌석 수정 */
export function updateSeat(seatId: number, body: SeatBody): Promise<Seat> {
  return apiPut<Seat>(`/api/v1/admin/seats/${seatId}`, body as unknown as Record<string, unknown>);
}

/** 좌석 삭제 */
export function deleteSeat(seatId: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/seats/${seatId}`);
}

/* ── 좌석 변경 신청 API ── */

/** 좌석 변경 신청 목록 조회 */
export function getSeatChangeRequests(params?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page?: number;
  size?: number;
  sort?: string;
}): Promise<PageResponse<SeatChangeRequest>> {
  const query = new URLSearchParams();
  query.set('status', params?.status ?? 'PENDING');
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));
  if (params?.sort) query.set('sort', params.sort);
  return apiGet<PageResponse<SeatChangeRequest>>(`/api/v1/admin/seat-change-requests?${query.toString()}`);
}

/** 좌석 변경 신청 상세 조회 */
export function getSeatChangeRequest(requestId: number): Promise<SeatChangeRequest> {
  return apiGet<SeatChangeRequest>(`/api/v1/admin/seat-change-requests/${requestId}`);
}

/** 좌석 현황 조회 (좌석별 배정자 + 대기자) */
export function getSeatStatus(storeId?: number): Promise<SeatStatusItem[]> {
  const query = storeId ? `?storeId=${storeId}` : '';
  return apiGet<SeatStatusItem[]>(`/api/v1/admin/seat-change-requests/seat-status${query}`);
}

/** 좌석 변경 신청 승인 */
export function approveSeatChangeRequest(requestId: number): Promise<SeatChangeRequest> {
  return apiPut<SeatChangeRequest>(`/api/v1/admin/seat-change-requests/${requestId}/approve`);
}

/** 좌석 변경 신청 거절 */
export function rejectSeatChangeRequest(requestId: number): Promise<SeatChangeRequest> {
  return apiPut<SeatChangeRequest>(`/api/v1/admin/seat-change-requests/${requestId}/reject`);
}
