import { apiGet } from './client';

export interface StudentMessage {
  id: number;
  studentId: number;
  studentName: string;
  content: string;
  active: boolean;
  createdAt: string;
}

export function getStudentMessages(studentId: number): Promise<StudentMessage[]> {
  return apiGet<StudentMessage[]>(`/api/v1/kiosk/student-messages?studentId=${studentId}`);
}
