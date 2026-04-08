import { apiGet, apiPost, apiPut, apiDelete } from './client';

/* ── 타입 ── */

export interface Student {
  id: number;
  storeId: number;
  storeName: string;
  name: string;
  phone: string;
  qrUuid: string;
  rfidUid: string;
  studentNumber: string;
  grade: string;
  className: string;
  assignedSeatId: number;
  assignedSeatLabel: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateStudentRequest {
  name: string;
  phone: string;
  grade: string;
  className: string;
  rfidUid: string;
  studentNumber: string;
  seatId?: number;
}

interface UpdateStudentRequest {
  name: string;
  phone: string;
  grade: string;
  className: string;
  rfidUid: string;
  studentNumber: string;
  seatId?: number;
}

/* ── API ── */

/** 학생 목록 조회 (MANAGER: 자기 지점, ADMIN: 전체) */
export function getStudents(): Promise<Student[]> {
  return apiGet<Student[]>('/api/v1/admin/students');
}

/** 학생 단건 조회 */
export function getStudent(studentId: number): Promise<Student> {
  return apiGet<Student>(`/api/v1/admin/students/${studentId}`);
}

/** 학생 등록 (MANAGER: 자기 지점 자동, ADMIN: storeId 필수) QR UUID 자동 생성 */
export function createStudent(data: CreateStudentRequest): Promise<Student> {
  return apiPost<Student>('/api/v1/admin/students', data as unknown as Record<string, unknown>);
}

/** 학생 수정 */
export function updateStudent(studentId: number, data: UpdateStudentRequest): Promise<Student> {
  return apiPut<Student>(`/api/v1/admin/students/${studentId}`, data as unknown as Record<string, unknown>);
}

/** 학생 삭제 */
export function deleteStudent(studentId: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/students/${studentId}`);
}

/** 학생 QR 코드 PNG 다운로드 */
export async function downloadStudentQr(studentId: number): Promise<Blob> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/students/${studentId}/qr`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`QR 다운로드 실패: ${res.status}`);
  }
  return res.blob();
}

/** 여러 학생 QR 코드를 ZIP으로 일괄 다운로드 */
export async function downloadStudentsQrBulk(studentIds: number[]): Promise<Blob> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/students/qr/bulk`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds }),
  });
  if (!res.ok) {
    throw new Error(`QR 일괄 다운로드 실패: ${res.status}`);
  }
  return res.blob();
}
