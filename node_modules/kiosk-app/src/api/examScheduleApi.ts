import { apiGet } from './client';

export interface ExamSchedule {
  id: number;
  storeId: number;
  storeName: string;
  examName: string;
  examDate: string;
  createdAt: string;
  updatedAt: string;
}

export function getExamSchedules(): Promise<ExamSchedule[]> {
  return apiGet<ExamSchedule[]>('/api/v1/kiosk/exam-schedules');
}
