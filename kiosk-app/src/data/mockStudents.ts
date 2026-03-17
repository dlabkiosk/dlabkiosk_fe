export interface Student {
  id: number;
  name: string;
  studentNumber: string;
  assignedSeatLabel: string;
  /** 학생을 식별한 값 (rfidUid / 좌석번호 / 전번 뒷자리) — API 호출 시 identifier로 사용 */
  identifier?: string;
}
