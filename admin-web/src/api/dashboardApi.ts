import { apiGet } from './client';

/* ── 대시보드 전체 조회 응답 타입 ── */

export interface DailyOperation {
  registeredStudents: number;
  todayAttendance: number;
  mealRequests: number;
}

export interface MealTagRecord {
  studentName: string;
  mealType: string;
  taggedAt: string;
}

export interface MealTagSummary {
  lunchCount: number;
  dinnerCount: number;
  details: MealTagRecord[];
}

export interface AttendanceSummary {
  present: number;
  earlyLeave: number;
  absent: number;
  outing: number;
  late: number;
}

export interface SeatLeaveSummary {
  totalLeave: number;
  waitingReturn: number;
}

export interface StudyRanking {
  code: number;
  message: string;
  data: string;
  extra: Record<string, string>;
  success: boolean;
  dataAsList: Record<string, string>[];
  total_inwon: string;
  study_tm: string;
}

export interface PendingApproval {
  id: number;
  requestType: string;
  requestContent: string;
  requesterName: string;
  requestedAt: string;
}

export interface DashboardNotice {
  id: number;
  title: string;
  createdBy: string;
  createdAt: string;
}

export interface SeatChangeRequest {
  id: number;
  studentName: string;
  currentSeatLabel: string;
  desiredSeat1Label: string;
  desiredSeat2Label: string;
  desiredSeat3Label: string;
  requestedAt: string;
}

export interface DashboardData {
  dailyOperation: DailyOperation;
  mealTagSummary: MealTagSummary;
  attendanceSummary: AttendanceSummary;
  seatLeaveSummary: SeatLeaveSummary;
  studyRanking: StudyRanking;
  pendingApprovals: PendingApproval[];
  seatChangeRequests: SeatChangeRequest[];
  notices: DashboardNotice[];
}

/* ── API 호출 ── */

export function getDashboardAll(storeId?: number): Promise<DashboardData> {
  const params = storeId !== undefined ? `?storeId=${storeId}` : '';
  return apiGet<DashboardData>(`/api/v1/admin/dashboard/all${params}`);
}
