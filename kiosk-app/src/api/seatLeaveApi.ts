import { apiGet, apiPost, ApiError } from './client';

/* ── 에러 메시지 매핑 ── */

const SEAT_LEAVE_ERROR_MESSAGES: Record<string, string> = {
  NOT_CHECKED_IN: '등원 처리를 먼저 해주세요.',
  NO_ACTIVE_SEAT: '등원 처리를 먼저 해주세요.',
  NO_SEAT: '등원 처리를 먼저 해주세요.',
  STUDENT_NOT_FOUND: '등록되지 않은 학생입니다.',
  SEAT_NOT_FOUND: '등원 처리를 먼저 해주세요.',
  ALREADY_ON_LEAVE: '이미 좌석 이탈 중입니다.',
};

/** 백엔드 원문 메시지(부분 매칭) → 사용자 친화적 메시지 */
const SEAT_LEAVE_MESSAGE_MAP: Record<string, string> = {
  '사용중인 좌석이 없': '등원 처리를 먼저 해주세요.',
  '사용 중인 좌석이 없': '등원 처리를 먼저 해주세요.',
  '좌석이 없': '등원 처리를 먼저 해주세요.',
  '출석 정보가 없': '등원 처리를 먼저 해주세요.',
  '등원하지 않': '등원 처리를 먼저 해주세요.',
};

/* ── 타입 ── */

export interface SeatLeaveReason {
  id: number;
  storeId: number;
  reasonName: string;
  displayOrder: number;
  active: boolean;
  /** 업로드된 아이콘 이미지 URL. 없으면 텍스트만 표시 */
  iconUrl?: string | null;
}

export interface SeatLeaveResult {
  id: number;
  studentId: number;
  studentName: string;
  seatLabel: string;
  reasonName: string;
  startedAt: string;
  endedAt: string | null;
}

/* ── API ── */

/** 현재 지점의 활성 이탈 사유 조회 */
export function getSeatLeaveReasons(): Promise<SeatLeaveReason[]> {
  return apiGet<SeatLeaveReason[]>('/api/v1/kiosk/seat-leaves/reasons');
}

/** 좌석 이탈 시작 — identifier + inputMethod로 학생 식별 */
export function startSeatLeave(identifier: string, reasonId: number, inputMethod?: string): Promise<SeatLeaveResult> {
  return apiPost<SeatLeaveResult>('/api/v1/kiosk/seat-leaves/start', { identifier, reasonId, inputMethod })
    .catch((err) => {
      if (err instanceof ApiError) {
        // 에러 코드 기반 매핑
        if (SEAT_LEAVE_ERROR_MESSAGES[err.code]) {
          throw new ApiError(err.code, SEAT_LEAVE_ERROR_MESSAGES[err.code]);
        }
        // 에러 메시지 부분 매칭 (백엔드 메시지 변형 대응)
        for (const [keyword, friendly] of Object.entries(SEAT_LEAVE_MESSAGE_MAP)) {
          if (err.message.includes(keyword)) {
            throw new ApiError(err.code, friendly);
          }
        }
      }
      throw err;
    });
}

/** 좌석 이탈 복귀 — identifier + inputMethod로 학생 식별 */
export function endSeatLeave(identifier: string, inputMethod?: string): Promise<SeatLeaveResult> {
  return apiPost<SeatLeaveResult>('/api/v1/kiosk/seat-leaves/end', { identifier, inputMethod });
}
