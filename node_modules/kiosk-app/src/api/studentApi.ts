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
  assignedSeatLabel: string;
  seatChangeRequest: SeatChangeRequest | null;
}

export interface StudentBySeatResult {
  id: number;
  storeId: number;
  storeName: string;
  name: string;
  rfidUid: string;
  studentNumber: string;
  assignedSeatId: number;
  assignedSeatLabel: string;
  createdAt: string;
  updatedAt: string;
}

export function searchStudent(params: { identifier?: string; studentNumber?: string }): Promise<StudentSearchResult> {
  const query = new URLSearchParams();
  if (params.identifier) query.set('identifier', params.identifier);
  if (params.studentNumber) query.set('studentNumber', params.studentNumber);
  return apiGet<StudentSearchResult>(`/api/v1/kiosk/students/search?${query.toString()}`);
}

export function getStudentBySeat(seatLabel: string): Promise<StudentBySeatResult> {
  const query = new URLSearchParams({ seatLabel });
  return apiGet<StudentBySeatResult>(`/api/v1/kiosk/students/by-seat?${query.toString()}`);
}
