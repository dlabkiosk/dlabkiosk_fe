// ============================================
// DSA API 공통 타입
// ============================================

/** DSA API 공통 응답 (성공) */
export interface DsaBaseResponse {
  code: number;
  message: string;
}

/** DSA 에러 코드 */
export const DSA_CODE = {
  SUCCESS: 0,
  INVALID_ACCOUNT: 101,
  INVALID_PARAM: 901,
} as const;

// ============================================
// 1. 인증 (Auth)
// ============================================

/** 토큰 발급 요청 */
export interface TokenRequest {
  acad_cd: string;
  client_id: string;
  secret_id: string;
  service: 'kiosk';
}

/** 토큰 발급 응답 */
export interface TokenResponse extends DsaBaseResponse {
  token: string;
  refreshToken: string;
}

/** 토큰 갱신 요청 */
export interface RefreshTokenRequest {
  client_id: string;
  refreshToken: string;
}

/** 토큰 갱신 응답 */
export interface RefreshTokenResponse extends DsaBaseResponse {
  token: string;
}

// ============================================
// 2. 출결 (Attendance)
// ============================================

/** 출결 처리 구분 */
export const ATT_GN = {
  CHECK_IN: 'S',
  CHECK_OUT: 'T',
  LATE: 'A',
  OUTING: 'D',
  EARLY_LEAVE: 'C',
  RETURN: 'R',
} as const;

export type AttGn = (typeof ATT_GN)[keyof typeof ATT_GN];

/** 현재 출석인원 응답 */
export interface TotalAttendCountResponse extends DsaBaseResponse {
  total_inwon: string;
}

/** 금일 1등 등원생 항목 */
export interface FirstAttendStdItem {
  std_nm: string;
  att_tm: string;
}

/** 금일 1등 등원생 응답 */
export interface FirstAttendStdResponse extends DsaBaseResponse {
  data: FirstAttendStdItem[] | null;
}

/** 원생 출결 저장 요청 */
export interface SetAttendStdRequest {
  token: string;
  rfid_no: string;
  tag_dt: string;
  con_gn: string | null;
}

/** 원생 출결 저장 응답 */
export interface SetAttendStdResponse extends DsaBaseResponse {
  hak_no: string;
  std_nm: string;
  att_gn: AttGn;
}

/** 원생 출결 현황 요청 */
export interface GetAttendListStdRequest {
  token: string;
  rfid_no: string;
  month: string;
}

/** 원생 출결 현황 응답 */
export interface GetAttendListStdResponse extends DsaBaseResponse {
  hak_no: string;
  std_nm: string;
  reOut: string;
  reLeave: string;
  beLate: string;
  beEarly: string;
  pPoint: string;
  mPoint: string;
}

// ============================================
// 3. 출결 신청 (Attendance Request)
// ============================================

/** 신청구분 */
export const REG_GN = {
  VACATION: '1',
  AM_HALF: '2',
  PM_HALF: '3',
  OUTING: '4',
  REASON_LATE: '5',
  REASON_EARLY: '6',
  REASON_OUTING: '7',
} as const;

/** 신청현황 */
export const REQUEST_STATE = {
  PENDING: 'D',
  APPROVED: 'S',
  REJECTED: 'E',
} as const;

/** 출결 신청내역 항목 */
export interface RequestListItem {
  hak_no: string;
  std_nm: string;
  reg_cd: string;
  reg_dt: string;
  reg_gn: string;
  state: string;
}

/** 출결 신청내역 응답 */
export interface GetRequestListStdResponse extends DsaBaseResponse {
  hak_no: string;
  std_nm: string;
  data: RequestListItem[] | null;
}

/** 출결 신청 저장 요청 */
export interface SetAttendRequestStdRequest {
  token: string;
  rfid_no: string;
  reg_gn: string;
  excuse_gn: 'Y' | 'N';
  reg_dt: string;
}

/** 출결 신청취소 요청 */
export interface SetRequestCancelStdRequest {
  token: string;
  rfid_no: string;
  reg_cd: string;
}

// ============================================
// 4. 좌석/구역 (Seat / Area)
// ============================================

/** 좌석 상태 */
export const DSA_SEAT_STATE = {
  CHECK_IN: 'S',
  OUTING: 'D',
  ABSENT: 'N',
  EMPTY: 'B',
} as const;

/** 좌석 구분 */
export const DSA_SEAT_GN = {
  USED: 'Y',
  UNUSED: 'N',
  PASSAGE: 'E',
} as const;

/** 구역 정보 항목 */
export interface StudyAreaItem {
  area_cd: string;
  area_nm: string;
  total_inwon: string;
}

/** 구역 정보 응답 */
export interface GetStudyAreaInfoResponse extends DsaBaseResponse {
  data: StudyAreaItem[] | null;
}

/** 구역 좌석 정보 항목 */
export interface StudyAreaSeatItem {
  xpos: string;
  ypos: string;
  seat_gn: string;
  seat_id: string;
  seat_nm: string;
}

/** 구역 좌석 정보 응답 */
export interface GetStudyAreaSeatInfoResponse extends DsaBaseResponse {
  data: StudyAreaSeatItem[] | null;
}

/** 구역별 출석 인원 항목 */
export interface AttendAreaCountItem {
  area_cd: string;
  att_cnt: string;
}

/** 구역별 출석 인원 응답 */
export interface GetAttendAreaCountResponse extends DsaBaseResponse {
  data: AttendAreaCountItem[] | null;
}

/** 구역/좌석별 상태 항목 */
export interface SeatStateItem {
  seat_cd: string;
  state: string;
}

/** 구역/좌석별 상태 응답 */
export interface GetStudyAreaSeatStateResponse extends DsaBaseResponse {
  data: SeatStateItem[] | null;
}

// ============================================
// 5. 랭킹/공부시간 (Ranking / Study Time)
// ============================================

/** 전주 공부시간 1위 항목 */
export interface FirstStudyTimeStdItem {
  std_nm: string;
  study_tm: string;
}

/** 전주 공부시간 1위 응답 */
export interface GetFirstLastWeekStudyTimeStdResponse extends DsaBaseResponse {
  data: FirstStudyTimeStdItem[] | null;
}

/** 전주 1일 평균 공부시간 응답 */
export interface GetAvgLastWeekStudyTimeResponse extends DsaBaseResponse {
  study_tm: string;
}

/** 전주 공부순위 항목 */
export interface StudyTimeRankItem {
  rank: string;
  std_nm: string;
  study_tm: string;
}

/** 전주 공부순위 응답 */
export interface GetLastWeekStudyTimeListResponse extends DsaBaseResponse {
  data: StudyTimeRankItem[] | null;
}

// ============================================
// 6. 시간표/강좌 (Schedule / Lesson)
// ============================================

/** 시간표 항목 */
export interface ScheduleItem {
  tm_cd: string;
  seq: string;
  tm_nm: string;
  st_tm: string;
  ed_tm: string;
  lec_gn: 'Y' | 'N';
  bigo: string;
}

/** 시간표 응답 */
export interface GetScheduleInfoResponse extends DsaBaseResponse {
  data: ScheduleItem[] | null;
}

/** 강좌 시간 항목 */
export interface LessonItem {
  tm_cd: string;
  week_gn: string;
  spc_cd: string;
  spc_nm: string;
}

/** 강좌 시간 응답 */
export interface GetLessonInfoResponse extends DsaBaseResponse {
  data: LessonItem[] | null;
}

// ============================================
// 7. 지점 (Branch / DLab)
// ============================================

/** 지점 정보 항목 */
export interface DlabItem {
  acad_cd: string;
  acad_nm: string;
  full_nm: string;
}

/** 지점 목록 조회 응답 */
export interface GetDlabListResponse extends DsaBaseResponse {
  data: DlabItem[] | null;
}
