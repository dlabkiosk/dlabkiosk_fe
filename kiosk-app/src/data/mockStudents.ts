import type {
  PhoneSubmission,
  SeatChangeRequest,
  SeatLeave,
  MealApplication,
  Receipt,
  AttendanceSummary,
  PointRecord,
} from '../api/studentApi';

export interface Student {
  id: number;
  name: string;
  studentNumber: string;
  assignedSeatLabel: string;
  /** 학생을 식별한 값 (rfidUid / 좌석번호 / 전번 뒷자리) — API 호출 시 identifier로 사용 */
  identifier?: string;
  /** 학적 조회용 상세 데이터 */
  phoneSubmissions?: PhoneSubmission[];
  seatChangeRequests?: SeatChangeRequest[];
  seatLeaves?: SeatLeave[];
  mealApplications?: MealApplication[];
  receipts?: Receipt[];
  attendanceSummary?: AttendanceSummary | null;
  points?: PointRecord[];
}
